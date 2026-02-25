use anchor_lang::prelude::*;
use anchor_spl::token::{self, spl_token, CloseAccount, Mint, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::DeepPulseError;
use crate::events::*;
use crate::state::*;

// ============================================
// CREATE DEPOSIT (Escrow)
// ============================================

#[derive(Accounts)]
#[instruction(deposit_type: DepositType, content_hash: [u8; 32], deposit_index: u32)]
pub struct CreateDeposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(
        constraint = hub.is_active @ DeepPulseError::HubNotActive,
    )]
    pub hub: Box<Account<'info, Hub>>,

    #[account(
        init,
        payer = depositor,
        space = Deposit::LEN,
        seeds = [DEPOSIT_SEED, depositor.key().as_ref(), &deposit_index.to_le_bytes()],
        bump,
    )]
    pub deposit: Box<Account<'info, Deposit>>,

    /// Escrow token account (PDA-owned, holds deposited $SKR)
    #[account(
        init,
        payer = depositor,
        token::mint = skr_mint,
        token::authority = escrow_authority,
        seeds = [ESCROW_SEED, deposit.key().as_ref()],
        bump,
    )]
    pub escrow_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Escrow PDA authority (same seeds as escrow_token_account for signing)
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED, deposit.key().as_ref()],
        bump,
    )]
    pub escrow_authority: SystemAccount<'info>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Box<Account<'info, PlatformConfig>>,

    /// Depositor's $SKR token account
    #[account(
        mut,
        constraint = depositor_token_account.owner == depositor.key(),
        constraint = depositor_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub depositor_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        constraint = skr_mint.key() == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub skr_mint: Box<Account<'info, anchor_spl::token::Mint>>,

    /// User score (optional — for tracking)
    #[account(
        mut,
        seeds = [USER_SCORE_SEED, depositor.key().as_ref()],
        bump = user_score.bump,
    )]
    pub user_score: Option<Box<Account<'info, UserScore>>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn create_deposit(
    ctx: Context<CreateDeposit>,
    deposit_type: DepositType,
    content_hash: [u8; 32],
    deposit_index: u32,
) -> Result<()> {
    let config = &ctx.accounts.platform_config;
    let clock = Clock::get()?;

    // Verify hub subscription is still active
    require!(
        ctx.accounts.hub.subscription_paid_until >= clock.unix_timestamp,
        DeepPulseError::HubSubscriptionExpired
    );

    // Determine deposit amount based on type
    let amount = match deposit_type {
        DepositType::Feedback => config.feedback_deposit,
        DepositType::DaoProposal => config.dao_proposal_deposit,
        DepositType::Talent => config.talent_deposit,
    };

    // Transfer $SKR from depositor → escrow
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.depositor_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        ),
        amount,
    )?;

    // Initialize deposit account
    let deposit = &mut ctx.accounts.deposit;
    deposit.depositor = ctx.accounts.depositor.key();
    deposit.hub = ctx.accounts.hub.key();
    deposit.deposit_type = deposit_type;
    deposit.amount = amount;
    deposit.status = DepositStatus::Pending;
    deposit.content_hash = content_hash;
    deposit.created_at = clock.unix_timestamp;
    deposit.resolved_at = 0;
    deposit.resolver = Pubkey::default();
    deposit.deposit_index = deposit_index;
    deposit.bump = ctx.bumps.deposit;

    // [H-03 FIX] Only increment action count on deposit creation (no score yet).
    // Score is awarded on APPROVAL, preventing farming via spam deposits.
    if let Some(score) = &mut ctx.accounts.user_score {
        score.action_types_used |= 1 << (match deposit_type {
            DepositType::Feedback => ActionType::Feedback,
            DepositType::Talent => ActionType::TalentSubmit,
            DepositType::DaoProposal => ActionType::DaoBoost,
        } as u8);
        score.last_activity = clock.unix_timestamp;
    }

    emit!(DepositCreated {
        deposit: deposit.key(),
        depositor: deposit.depositor,
        hub: deposit.hub,
        deposit_type: deposit_type as u8,
        amount,
        deposit_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// APPROVE FEEDBACK (Brand moderates → refund user)
// ============================================

#[derive(Accounts)]
pub struct ApproveFeedback<'info> {
    /// Brand (hub creator) approving the feedback
    pub resolver: Signer<'info>,

    #[account(
        mut,
        close = depositor,
        constraint = deposit.status == DepositStatus::Pending @ DeepPulseError::DepositNotPending,
        constraint = deposit.deposit_type == DepositType::Feedback @ DeepPulseError::DepositTypeMismatch,
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(
        constraint = hub.creator == resolver.key() @ DeepPulseError::UnauthorizedModerator,
        constraint = hub.key() == deposit.hub,
    )]
    pub hub: Account<'info, Hub>,

    /// Escrow token account holding the deposited $SKR
    #[account(
        mut,
        seeds = [ESCROW_SEED, deposit.key().as_ref()],
        bump,
        constraint = escrow_token_account.amount >= deposit.amount,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: Escrow PDA authority for signing
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED, deposit.key().as_ref()],
        bump,
    )]
    pub escrow_authority: SystemAccount<'info>,

    /// Depositor's $SKR token account (receives refund)
    #[account(
        mut,
        constraint = depositor_token_account.owner == deposit.depositor,
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,

    /// CHECK: Depositor receives rent from closed deposit + escrow accounts
    #[account(mut, constraint = depositor.key() == deposit.depositor)]
    pub depositor: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn approve_feedback(ctx: Context<ApproveFeedback>) -> Result<()> {
    let deposit_key = ctx.accounts.deposit.key();
    let escrow_bump = ctx.bumps.escrow_authority;
    // [C-02 FIX] Use ESCROW_AUTHORITY_SEED to match escrow_authority PDA
    let escrow_seeds = &[ESCROW_AUTHORITY_SEED, deposit_key.as_ref(), &[escrow_bump]];
    let signer_seeds = &[&escrow_seeds[..]];

    // Transfer escrow → depositor (refund)
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.depositor_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.deposit.amount,
    )?;

    // Close escrow token account (return rent to depositor)
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.depositor.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        },
        signer_seeds,
    ))?;

    let clock = Clock::get()?;
    let deposit = &mut ctx.accounts.deposit;
    deposit.status = DepositStatus::Approved;
    deposit.resolved_at = clock.unix_timestamp;
    deposit.resolver = ctx.accounts.resolver.key();

    emit!(DepositApproved {
        deposit: deposit.key(),
        depositor: deposit.depositor,
        resolver: deposit.resolver,
        deposit_type: deposit.deposit_type as u8,
        amount: deposit.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// APPROVE DAO PROPOSAL (Brand → refund + create vault)
// ============================================

#[derive(Accounts)]
#[instruction(vault_index: u32)]
pub struct ApproveDaoProposal<'info> {
    #[account(mut)]
    pub resolver: Signer<'info>,

    #[account(
        mut,
        close = depositor,
        constraint = deposit.status == DepositStatus::Pending @ DeepPulseError::DepositNotPending,
        constraint = deposit.deposit_type == DepositType::DaoProposal @ DeepPulseError::DepositTypeMismatch,
    )]
    pub deposit: Box<Account<'info, Deposit>>,

    #[account(
        constraint = hub.creator == resolver.key() @ DeepPulseError::UnauthorizedModerator,
        constraint = hub.key() == deposit.hub,
    )]
    pub hub: Box<Account<'info, Hub>>,

    /// Escrow token account
    #[account(
        mut,
        seeds = [ESCROW_SEED, deposit.key().as_ref()],
        bump,
        constraint = escrow_token_account.amount >= deposit.amount,
    )]
    pub escrow_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Escrow PDA authority — validated by seeds
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED, deposit.key().as_ref()],
        bump,
    )]
    pub escrow_authority: UncheckedAccount<'info>,

    /// Depositor's token account (receives refund)
    #[account(
        mut,
        constraint = depositor_token_account.owner == deposit.depositor,
    )]
    pub depositor_token_account: Box<Account<'info, TokenAccount>>,

    /// CHECK: Depositor receives rent — validated by constraint
    #[account(mut, constraint = depositor.key() == deposit.depositor)]
    pub depositor: UncheckedAccount<'info>,

    /// New DAO Vault to create
    #[account(
        init,
        payer = resolver,
        space = DaoVault::LEN,
        seeds = [VAULT_SEED, hub.key().as_ref(), &vault_index.to_le_bytes()],
        bump,
    )]
    pub dao_vault: Box<Account<'info, DaoVault>>,

    /// CHECK: Vault token account — initialized via CPI in handler
    /// Seeds: [VAULT_TOKEN_SEED, dao_vault.key()]
    #[account(
        mut,
        seeds = [VAULT_TOKEN_SEED, dao_vault.key().as_ref()],
        bump,
    )]
    pub vault_token_account: UncheckedAccount<'info>,

    /// CHECK: Vault token PDA authority — validated by seeds (distinct from vault_token_account)
    /// Used as authority for the token account
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, dao_vault.key().as_ref()],
        bump,
    )]
    pub vault_token_authority: UncheckedAccount<'info>,

    /// $SKR mint — validated against escrow_token_account.mint
    #[account(
        constraint = skr_mint.key() == escrow_token_account.mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub skr_mint: Box<Account<'info, Mint>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn approve_dao_proposal(
    ctx: Context<ApproveDaoProposal>,
    vault_index: u32,
    title: String,
    description: String,
    target_amount: u64,
    expires_at: i64,
) -> Result<()> {
    require!(title.len() <= MAX_VAULT_TITLE_LEN, DeepPulseError::VaultTitleTooLong);
    require!(
        description.len() <= MAX_VAULT_DESCRIPTION_LEN,
        DeepPulseError::VaultDescriptionTooLong
    );

    // F-13: Validate target_amount > 0
    require!(target_amount > 0, DeepPulseError::VaultTargetZero);

    // F-03: Validate expires_at bounds (1 day min, 1 year max)
    let clock_now = Clock::get()?.unix_timestamp;
    require!(
        expires_at >= clock_now + MIN_VAULT_DURATION_SECS,
        DeepPulseError::VaultExpiryTooSoon
    );
    require!(
        expires_at <= clock_now + MAX_VAULT_DURATION_SECS,
        DeepPulseError::VaultExpiryTooFar
    );

    let deposit_key = ctx.accounts.deposit.key();
    let escrow_bump = ctx.bumps.escrow_authority;
    // [C-02 FIX] Use ESCROW_AUTHORITY_SEED to match escrow_authority PDA
    let escrow_seeds = &[ESCROW_AUTHORITY_SEED, deposit_key.as_ref(), &[escrow_bump]];
    let signer_seeds = &[&escrow_seeds[..]];

    // Refund escrow → depositor
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.depositor_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.deposit.amount,
    )?;

    // Close escrow token account
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.depositor.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        },
        signer_seeds,
    ))?;

    // Initialize vault token account via CPI
    let vault_key = ctx.accounts.dao_vault.key();
    let vault_token_bump = ctx.bumps.vault_token_account;
    let vault_token_seeds = &[VAULT_TOKEN_SEED, vault_key.as_ref(), &[vault_token_bump]];
    let vault_signer_seeds = &[&vault_token_seeds[..]];

    // Create the vault token account (PDA-owned)
    let rent = &ctx.accounts.rent;
    let space = TokenAccount::LEN;
    let lamports = rent.minimum_balance(space);

    anchor_lang::system_program::create_account(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::CreateAccount {
                from: ctx.accounts.resolver.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
            },
            vault_signer_seeds,
        ),
        lamports,
        space as u64,
        &spl_token::ID,
    )?;

    // Initialize the token account with the vault authority as owner
    let init_ix = spl_token::instruction::initialize_account3(
        &spl_token::ID,
        &ctx.accounts.vault_token_account.key(),
        &ctx.accounts.skr_mint.key(),
        &ctx.accounts.vault_token_authority.key(),
    )?;
    anchor_lang::solana_program::program::invoke(
        &init_ix,
        &[
            ctx.accounts.vault_token_account.to_account_info(),
            ctx.accounts.skr_mint.to_account_info(),
        ],
    )?;

    let clock = Clock::get()?;

    // Update deposit status
    let deposit = &mut ctx.accounts.deposit;
    deposit.status = DepositStatus::Approved;
    deposit.resolved_at = clock.unix_timestamp;
    deposit.resolver = ctx.accounts.resolver.key();

    // Initialize DAO Vault
    let vault = &mut ctx.accounts.dao_vault;
    vault.proposal_deposit = deposit.key();
    vault.hub = ctx.accounts.hub.key();
    vault.creator = deposit.depositor;
    vault.brand = ctx.accounts.resolver.key();
    vault.title = title;
    vault.description = description;
    vault.target_amount = target_amount;
    vault.current_amount = 0;
    vault.contributor_count = 0;
    vault.status = VaultStatus::Open;
    vault.created_at = clock.unix_timestamp;
    vault.funded_at = 0;
    vault.expires_at = expires_at;
    vault.vault_index = vault_index;
    vault.bump = ctx.bumps.dao_vault;

    emit!(DepositApproved {
        deposit: deposit.key(),
        depositor: deposit.depositor,
        resolver: deposit.resolver,
        deposit_type: deposit.deposit_type as u8,
        amount: deposit.amount,
        timestamp: clock.unix_timestamp,
    });

    emit!(VaultCreated {
        vault: vault.key(),
        hub: vault.hub,
        creator: vault.creator,
        brand: vault.brand,
        target_amount,
        expires_at,
        vault_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// APPROVE TALENT (Brand → refund user)
// ============================================

#[derive(Accounts)]
pub struct ApproveTalent<'info> {
    pub resolver: Signer<'info>,

    #[account(
        mut,
        close = depositor,
        constraint = deposit.status == DepositStatus::Pending @ DeepPulseError::DepositNotPending,
        constraint = deposit.deposit_type == DepositType::Talent @ DeepPulseError::DepositTypeMismatch,
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(
        constraint = hub.creator == resolver.key() @ DeepPulseError::UnauthorizedModerator,
        constraint = hub.key() == deposit.hub,
    )]
    pub hub: Account<'info, Hub>,

    #[account(
        mut,
        seeds = [ESCROW_SEED, deposit.key().as_ref()],
        bump,
        constraint = escrow_token_account.amount >= deposit.amount,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: Escrow PDA authority
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED, deposit.key().as_ref()],
        bump,
    )]
    pub escrow_authority: SystemAccount<'info>,

    #[account(
        mut,
        constraint = depositor_token_account.owner == deposit.depositor,
    )]
    pub depositor_token_account: Account<'info, TokenAccount>,

    /// CHECK: Depositor receives rent
    #[account(mut, constraint = depositor.key() == deposit.depositor)]
    pub depositor: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn approve_talent(ctx: Context<ApproveTalent>) -> Result<()> {
    let deposit_key = ctx.accounts.deposit.key();
    let escrow_bump = ctx.bumps.escrow_authority;
    // [C-02 FIX] Use ESCROW_AUTHORITY_SEED to match escrow_authority PDA
    let escrow_seeds = &[ESCROW_AUTHORITY_SEED, deposit_key.as_ref(), &[escrow_bump]];
    let signer_seeds = &[&escrow_seeds[..]];

    // Refund escrow → depositor
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.depositor_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.deposit.amount,
    )?;

    // Close escrow
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.depositor.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        },
        signer_seeds,
    ))?;

    let clock = Clock::get()?;
    let deposit = &mut ctx.accounts.deposit;
    deposit.status = DepositStatus::Approved;
    deposit.resolved_at = clock.unix_timestamp;
    deposit.resolver = ctx.accounts.resolver.key();

    emit!(DepositApproved {
        deposit: deposit.key(),
        depositor: deposit.depositor,
        resolver: deposit.resolver,
        deposit_type: deposit.deposit_type as u8,
        amount: deposit.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// REJECT DEPOSIT (Brand → treasury keeps tokens)
// ============================================

#[derive(Accounts)]
pub struct RejectDeposit<'info> {
    pub resolver: Signer<'info>,

    #[account(
        mut,
        close = depositor,
        constraint = deposit.status == DepositStatus::Pending @ DeepPulseError::DepositNotPending,
    )]
    pub deposit: Account<'info, Deposit>,

    #[account(
        constraint = hub.creator == resolver.key() @ DeepPulseError::UnauthorizedModerator,
        constraint = hub.key() == deposit.hub,
    )]
    pub hub: Account<'info, Hub>,

    /// Escrow token account
    #[account(
        mut,
        seeds = [ESCROW_SEED, deposit.key().as_ref()],
        bump,
        constraint = escrow_token_account.amount >= deposit.amount,
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,

    /// CHECK: Escrow PDA authority
    #[account(
        seeds = [ESCROW_AUTHORITY_SEED, deposit.key().as_ref()],
        bump,
    )]
    pub escrow_authority: SystemAccount<'info>,

    /// Treasury token account (receives rejected deposit tokens — funds go to platform admin)
    #[account(
        mut,
        constraint = treasury_token_account.owner == platform_config.treasury,
        constraint = treasury_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// CHECK: Depositor receives rent from closed deposit + escrow accounts
    #[account(mut, constraint = depositor.key() == deposit.depositor)]
    pub depositor: SystemAccount<'info>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub token_program: Program<'info, Token>,
}

pub fn reject_deposit(ctx: Context<RejectDeposit>) -> Result<()> {
    let deposit_key = ctx.accounts.deposit.key();
    let escrow_bump = ctx.bumps.escrow_authority;
    // [C-02 FIX] Use ESCROW_AUTHORITY_SEED to match escrow_authority PDA
    let escrow_seeds = &[ESCROW_AUTHORITY_SEED, deposit_key.as_ref(), &[escrow_bump]];
    let signer_seeds = &[&escrow_seeds[..]];

    // Transfer escrow → treasury (platform keeps the deposit)
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            },
            signer_seeds,
        ),
        ctx.accounts.deposit.amount,
    )?;

    // Close escrow (rent → depositor)
    token::close_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        CloseAccount {
            account: ctx.accounts.escrow_token_account.to_account_info(),
            destination: ctx.accounts.depositor.to_account_info(),
            authority: ctx.accounts.escrow_authority.to_account_info(),
        },
        signer_seeds,
    ))?;

    let clock = Clock::get()?;
    let deposit = &mut ctx.accounts.deposit;
    deposit.status = DepositStatus::Rejected;
    deposit.resolved_at = clock.unix_timestamp;
    deposit.resolver = ctx.accounts.resolver.key();

    emit!(DepositRejected {
        deposit: deposit.key(),
        depositor: deposit.depositor,
        resolver: deposit.resolver,
        deposit_type: deposit.deposit_type as u8,
        amount: deposit.amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
