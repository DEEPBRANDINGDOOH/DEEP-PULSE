use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::DeepPulseError;
use crate::events::*;
use crate::state::*;

// ============================================
// CONTRIBUTE TO VAULT
// ============================================

#[derive(Accounts)]
pub struct ContributeToVault<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        constraint = dao_vault.status == VaultStatus::Open @ DeepPulseError::VaultNotOpen,
    )]
    pub dao_vault: Account<'info, DaoVault>,

    /// Contribution tracking account (one per contributor per vault)
    #[account(
        init_if_needed,
        payer = contributor,
        space = VaultContribution::LEN,
        seeds = [CONTRIBUTION_SEED, dao_vault.key().as_ref(), contributor.key().as_ref()],
        bump,
    )]
    pub contribution: Account<'info, VaultContribution>,

    /// Vault token account (receives contributions)
    #[account(
        mut,
        seeds = [VAULT_TOKEN_SEED, dao_vault.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// Contributor's $SKR token account
    #[account(
        mut,
        constraint = contributor_token_account.owner == contributor.key(),
        constraint = contributor_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// User score (optional)
    #[account(
        mut,
        seeds = [USER_SCORE_SEED, contributor.key().as_ref()],
        bump = user_score.bump,
    )]
    pub user_score: Option<Account<'info, UserScore>>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn contribute_to_vault(ctx: Context<ContributeToVault>, amount: u64) -> Result<()> {
    let config = &ctx.accounts.platform_config;
    let clock = Clock::get()?;

    require!(
        amount >= config.min_vault_contribution,
        DeepPulseError::ContributionTooSmall
    );

    // Check vault hasn't expired
    require!(
        clock.unix_timestamp < ctx.accounts.dao_vault.expires_at,
        DeepPulseError::VaultExpired
    );

    // Check vault not already funded
    require!(
        ctx.accounts.dao_vault.current_amount < ctx.accounts.dao_vault.target_amount,
        DeepPulseError::VaultAlreadyFunded
    );

    // F-05: Cap contribution so current_amount doesn't exceed target_amount
    let remaining = ctx.accounts.dao_vault.target_amount
        .checked_sub(ctx.accounts.dao_vault.current_amount)
        .ok_or(DeepPulseError::MathOverflow)?;
    let actual_amount = std::cmp::min(amount, remaining);
    require!(actual_amount > 0, DeepPulseError::ContributionExceedsTarget);

    // Transfer capped $SKR from contributor → vault
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.contributor_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.contributor.to_account_info(),
            },
        ),
        actual_amount,
    )?;

    // Update or init contribution tracking
    let contribution = &mut ctx.accounts.contribution;
    let is_new_contributor = contribution.amount == 0 && contribution.contributed_at == 0;

    if is_new_contributor {
        contribution.contributor = ctx.accounts.contributor.key();
        contribution.vault = ctx.accounts.dao_vault.key();
        contribution.contributed_at = clock.unix_timestamp;
        contribution.refunded = false;
        contribution.bump = ctx.bumps.contribution;
    }

    contribution.amount = contribution
        .amount
        .checked_add(actual_amount)
        .ok_or(DeepPulseError::MathOverflow)?;

    // Update vault
    let vault = &mut ctx.accounts.dao_vault;
    vault.current_amount = vault
        .current_amount
        .checked_add(actual_amount)
        .ok_or(DeepPulseError::MathOverflow)?;

    if is_new_contributor {
        vault.contributor_count = vault
            .contributor_count
            .checked_add(1)
            .ok_or(DeepPulseError::MathOverflow)?;
    }

    // Update user score
    if let Some(score) = &mut ctx.accounts.user_score {
        score.dao_boost_count = score
            .dao_boost_count
            .checked_add(1)
            .ok_or(DeepPulseError::ScoreOverflow)?;
        score.total_score = score
            .total_score
            .checked_add(SCORE_DAO_BOOST)
            .ok_or(DeepPulseError::ScoreOverflow)?;
        score.action_types_used |= 1 << (ActionType::DaoBoost as u8);
        score.last_activity = clock.unix_timestamp;

        emit!(ActionRecorded {
            user: ctx.accounts.contributor.key(),
            action_type: ActionType::DaoBoost as u8,
            score_delta: SCORE_DAO_BOOST,
            new_total_score: score.total_score,
            timestamp: clock.unix_timestamp,
        });
    }

    emit!(VaultContributed {
        vault: vault.key(),
        contributor: ctx.accounts.contributor.key(),
        amount: actual_amount,
        current_total: vault.current_amount,
        target_amount: vault.target_amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// COMPLETE VAULT (target reached → distribute)
// ============================================

#[derive(Accounts)]
pub struct CompleteVault<'info> {
    /// Anyone can call this once target is reached (permissionless crank)
    pub caller: Signer<'info>,

    #[account(
        mut,
        constraint = dao_vault.status == VaultStatus::Open @ DeepPulseError::VaultNotOpen,
        constraint = dao_vault.current_amount >= dao_vault.target_amount @ DeepPulseError::VaultTargetNotReached,
    )]
    pub dao_vault: Account<'info, DaoVault>,

    /// Vault token account
    #[account(
        mut,
        seeds = [VAULT_TOKEN_SEED, dao_vault.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Vault token PDA authority (distinct seed from vault_token_account)
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, dao_vault.key().as_ref()],
        bump,
    )]
    pub vault_token_authority: SystemAccount<'info>,

    /// Brand's $SKR token account (receives 95%)
    #[account(
        mut,
        constraint = brand_token_account.owner == dao_vault.brand,
    )]
    pub brand_token_account: Account<'info, TokenAccount>,

    /// Treasury $SKR token account (receives 5%)
    #[account(
        mut,
        constraint = treasury_token_account.owner == platform_config.treasury,
        constraint = treasury_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    pub token_program: Program<'info, Token>,
}

pub fn complete_vault(ctx: Context<CompleteVault>) -> Result<()> {
    let config = &ctx.accounts.platform_config;
    let vault = &ctx.accounts.dao_vault;
    let total = vault.current_amount;

    // Calculate split using basis points
    let brand_amount = total
        .checked_mul(config.dao_brand_share_bps as u64)
        .ok_or(DeepPulseError::MathOverflow)?
        .checked_div(10000)
        .ok_or(DeepPulseError::MathOverflow)?;

    let platform_fee = total
        .checked_sub(brand_amount)
        .ok_or(DeepPulseError::MathOverflow)?;

    let vault_key = ctx.accounts.dao_vault.key();
    let vault_token_bump = ctx.bumps.vault_token_authority;
    let vault_seeds = &[VAULT_TOKEN_SEED, vault_key.as_ref(), &[vault_token_bump]];
    let signer_seeds = &[&vault_seeds[..]];

    // Transfer 95% to brand
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.brand_token_account.to_account_info(),
                authority: ctx.accounts.vault_token_authority.to_account_info(),
            },
            signer_seeds,
        ),
        brand_amount,
    )?;

    // Transfer 5% to treasury
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.vault_token_authority.to_account_info(),
            },
            signer_seeds,
        ),
        platform_fee,
    )?;

    let clock = Clock::get()?;
    let vault = &mut ctx.accounts.dao_vault;
    vault.status = VaultStatus::Funded;
    vault.funded_at = clock.unix_timestamp;

    emit!(VaultCompleted {
        vault: vault.key(),
        brand: vault.brand,
        brand_amount,
        platform_fee,
        total_amount: total,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// CANCEL VAULT (Brand or Admin)
// ============================================

#[derive(Accounts)]
pub struct CancelVault<'info> {
    pub caller: Signer<'info>,

    #[account(
        mut,
        constraint = dao_vault.status == VaultStatus::Open @ DeepPulseError::VaultNotOpen,
        constraint = (
            caller.key() == dao_vault.brand ||
            caller.key() == platform_config.admin
        ) @ DeepPulseError::UnauthorizedVaultCancel,
    )]
    pub dao_vault: Account<'info, DaoVault>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

pub fn cancel_vault(ctx: Context<CancelVault>) -> Result<()> {
    let clock = Clock::get()?;
    let vault = &mut ctx.accounts.dao_vault;
    vault.status = VaultStatus::Cancelled;

    emit!(VaultCancelled {
        vault: vault.key(),
        cancelled_by: ctx.accounts.caller.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// EXPIRE VAULT (Permissionless crank — marks expired vaults)
// ============================================

#[derive(Accounts)]
pub struct ExpireVault<'info> {
    /// Anyone can call this (permissionless crank)
    pub caller: Signer<'info>,

    #[account(
        mut,
        constraint = dao_vault.status == VaultStatus::Open @ DeepPulseError::VaultNotOpen,
    )]
    pub dao_vault: Account<'info, DaoVault>,
}

pub fn expire_vault(ctx: Context<ExpireVault>) -> Result<()> {
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= ctx.accounts.dao_vault.expires_at,
        DeepPulseError::VaultNotExpired
    );

    let vault = &mut ctx.accounts.dao_vault;
    vault.status = VaultStatus::Expired;

    emit!(VaultExpired {
        vault: vault.key(),
        expired_by: ctx.accounts.caller.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// CLAIM VAULT REFUND (Contributor claims proportional refund after cancel/expire)
// ============================================

#[derive(Accounts)]
pub struct ClaimVaultRefund<'info> {
    #[account(mut)]
    pub contributor: Signer<'info>,

    #[account(
        mut,
        constraint = (
            dao_vault.status == VaultStatus::Cancelled ||
            dao_vault.status == VaultStatus::Expired
        ) @ DeepPulseError::VaultNotRefundable,
    )]
    pub dao_vault: Account<'info, DaoVault>,

    #[account(
        mut,
        seeds = [CONTRIBUTION_SEED, dao_vault.key().as_ref(), contributor.key().as_ref()],
        bump = contribution.bump,
        has_one = contributor,
        constraint = contribution.vault == dao_vault.key() @ DeepPulseError::NoContribution,
        constraint = !contribution.refunded @ DeepPulseError::AlreadyRefunded,
    )]
    pub contribution: Account<'info, VaultContribution>,

    /// Vault token account
    #[account(
        mut,
        seeds = [VAULT_TOKEN_SEED, dao_vault.key().as_ref()],
        bump,
    )]
    pub vault_token_account: Account<'info, TokenAccount>,

    /// CHECK: Vault token PDA authority (distinct seed from vault_token_account)
    #[account(
        seeds = [VAULT_AUTHORITY_SEED, dao_vault.key().as_ref()],
        bump,
    )]
    pub vault_token_authority: SystemAccount<'info>,

    /// Contributor's $SKR token account (receives refund)
    #[account(
        mut,
        constraint = contributor_token_account.owner == contributor.key(),
    )]
    pub contributor_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn claim_vault_refund(ctx: Context<ClaimVaultRefund>) -> Result<()> {
    let vault_key = ctx.accounts.dao_vault.key();
    let vault_token_bump = ctx.bumps.vault_token_authority;
    let vault_seeds = &[VAULT_TOKEN_SEED, vault_key.as_ref(), &[vault_token_bump]];
    let signer_seeds = &[&vault_seeds[..]];

    let refund_amount = ctx.accounts.contribution.amount;

    // Transfer contributor's share back from vault
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.contributor_token_account.to_account_info(),
                authority: ctx.accounts.vault_token_authority.to_account_info(),
            },
            signer_seeds,
        ),
        refund_amount,
    )?;

    // Mark contribution as refunded
    let contribution = &mut ctx.accounts.contribution;
    contribution.refunded = true;

    let clock = Clock::get()?;
    emit!(VaultRefunded {
        vault: ctx.accounts.dao_vault.key(),
        contributor: ctx.accounts.contributor.key(),
        refund_amount,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
