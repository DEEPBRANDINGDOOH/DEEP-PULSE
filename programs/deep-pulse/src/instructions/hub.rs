use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::DeepPulseError;
use crate::events::*;
use crate::state::{Hub, HubCategory, HubSubscription, PlatformConfig, UserScore};

// ============================================
// CREATE HUB
// ============================================

#[derive(Accounts)]
#[instruction(name: String, description: String, category: HubCategory, hub_index: u32)]
pub struct CreateHub<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = Hub::LEN,
        seeds = [HUB_SEED, creator.key().as_ref(), &hub_index.to_le_bytes()],
        bump,
    )]
    pub hub: Account<'info, Hub>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// Creator's $SKR token account (pays subscription)
    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key(),
        constraint = creator_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    /// Treasury $SKR token account (receives payment)
    #[account(
        mut,
        constraint = treasury_token_account.owner == platform_config.treasury,
        constraint = treasury_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn create_hub(
    ctx: Context<CreateHub>,
    name: String,
    description: String,
    category: HubCategory,
    hub_index: u32,
) -> Result<()> {
    require!(name.len() <= MAX_HUB_NAME_LEN, DeepPulseError::HubNameTooLong);
    require!(
        description.len() <= MAX_HUB_DESCRIPTION_LEN,
        DeepPulseError::HubDescriptionTooLong
    );

    let config = &ctx.accounts.platform_config;

    // Transfer hub subscription price from creator → treasury
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        config.hub_subscription_price,
    )?;

    let clock = Clock::get()?;

    let hub = &mut ctx.accounts.hub;
    hub.creator = ctx.accounts.creator.key();
    hub.name = name.clone();
    hub.description = description;
    hub.category = category;
    hub.subscriber_count = 0;
    hub.is_verified = false;
    hub.is_active = true;
    hub.subscription_paid_until = clock
        .unix_timestamp
        .checked_add(HUB_SUBSCRIPTION_DURATION_SECS)
        .ok_or(DeepPulseError::MathOverflow)?;
    hub.created_at = clock.unix_timestamp;
    hub.hub_index = hub_index;
    hub.bump = ctx.bumps.hub;

    emit!(HubCreated {
        hub: hub.key(),
        creator: hub.creator,
        name,
        category: category as u8,
        hub_index,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// RENEW HUB SUBSCRIPTION
// ============================================

#[derive(Accounts)]
pub struct RenewHubSubscription<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [HUB_SEED, creator.key().as_ref(), &hub.hub_index.to_le_bytes()],
        bump = hub.bump,
        has_one = creator @ DeepPulseError::UnauthorizedHubCreator,
    )]
    pub hub: Account<'info, Hub>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key(),
        constraint = creator_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = treasury_token_account.owner == platform_config.treasury,
        constraint = treasury_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn renew_hub_subscription(ctx: Context<RenewHubSubscription>) -> Result<()> {
    let config = &ctx.accounts.platform_config;

    // Transfer subscription price
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.creator_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.creator.to_account_info(),
            },
        ),
        config.hub_subscription_price,
    )?;

    let clock = Clock::get()?;
    let hub = &mut ctx.accounts.hub;

    // Extend from current expiry or now (whichever is later)
    let base_time = std::cmp::max(hub.subscription_paid_until, clock.unix_timestamp);
    hub.subscription_paid_until = base_time
        .checked_add(HUB_SUBSCRIPTION_DURATION_SECS)
        .ok_or(DeepPulseError::MathOverflow)?;

    emit!(HubSubscriptionRenewed {
        hub: hub.key(),
        creator: hub.creator,
        paid_until: hub.subscription_paid_until,
        amount: config.hub_subscription_price,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// SUBSCRIBE TO HUB (User)
// ============================================

#[derive(Accounts)]
pub struct SubscribeToHub<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        mut,
        constraint = hub.is_active @ DeepPulseError::HubNotActive,
    )]
    pub hub: Account<'info, Hub>,

    #[account(
        init,
        payer = user,
        space = HubSubscription::LEN,
        seeds = [SUBSCRIPTION_SEED, user.key().as_ref(), hub.key().as_ref()],
        bump,
    )]
    pub subscription: Account<'info, HubSubscription>,

    /// User score (init if needed via separate init_score instruction, or optional)
    #[account(
        mut,
        seeds = [USER_SCORE_SEED, user.key().as_ref()],
        bump = user_score.bump,
    )]
    pub user_score: Option<Account<'info, UserScore>>,

    pub system_program: Program<'info, System>,
}

pub fn subscribe_to_hub(ctx: Context<SubscribeToHub>) -> Result<()> {
    let clock = Clock::get()?;

    let sub = &mut ctx.accounts.subscription;
    sub.user = ctx.accounts.user.key();
    sub.hub = ctx.accounts.hub.key();
    sub.subscribed_at = clock.unix_timestamp;
    sub.bump = ctx.bumps.subscription;

    // Increment hub subscriber count
    let hub = &mut ctx.accounts.hub;
    hub.subscriber_count = hub
        .subscriber_count
        .checked_add(1)
        .ok_or(DeepPulseError::MathOverflow)?;

    // Update user score if account exists
    if let Some(score) = &mut ctx.accounts.user_score {
        score.subscribe_count = score
            .subscribe_count
            .checked_add(1)
            .ok_or(DeepPulseError::ScoreOverflow)?;
        score.total_score = score
            .total_score
            .checked_add(SCORE_SUBSCRIBE)
            .ok_or(DeepPulseError::ScoreOverflow)?;
        score.action_types_used |= 1 << (crate::state::ActionType::Subscribe as u8);
        score.last_activity = clock.unix_timestamp;

        emit!(ActionRecorded {
            user: ctx.accounts.user.key(),
            action_type: crate::state::ActionType::Subscribe as u8,
            score_delta: SCORE_SUBSCRIBE,
            new_total_score: score.total_score,
            timestamp: clock.unix_timestamp,
        });
    }

    emit!(UserSubscribed {
        user: ctx.accounts.user.key(),
        hub: hub.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// UNSUBSCRIBE FROM HUB
// ============================================

#[derive(Accounts)]
pub struct UnsubscribeFromHub<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut)]
    pub hub: Account<'info, Hub>,

    #[account(
        mut,
        seeds = [SUBSCRIPTION_SEED, user.key().as_ref(), hub.key().as_ref()],
        bump = subscription.bump,
        has_one = user,
        has_one = hub,
        close = user, // Return rent to user
    )]
    pub subscription: Account<'info, HubSubscription>,

    pub system_program: Program<'info, System>,
}

pub fn unsubscribe_from_hub(ctx: Context<UnsubscribeFromHub>) -> Result<()> {
    let hub = &mut ctx.accounts.hub;
    // [L-04 FIX] Use checked_sub instead of saturating_sub to catch logic errors
    hub.subscriber_count = hub
        .subscriber_count
        .checked_sub(1)
        .ok_or(DeepPulseError::MathOverflow)?;

    let clock = Clock::get()?;
    emit!(UserUnsubscribed {
        user: ctx.accounts.user.key(),
        hub: hub.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// SET HUB VERIFIED (Admin only)
// ============================================

#[derive(Accounts)]
pub struct SetHubVerified<'info> {
    #[account(
        constraint = admin.key() == platform_config.admin @ DeepPulseError::UnauthorizedAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub hub: Account<'info, Hub>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

pub fn set_hub_verified(ctx: Context<SetHubVerified>, is_verified: bool) -> Result<()> {
    ctx.accounts.hub.is_verified = is_verified;

    let clock = Clock::get()?;
    emit!(HubVerifiedChanged {
        hub: ctx.accounts.hub.key(),
        is_verified,
        changed_by: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// SET HUB ACTIVE (Admin only)
// ============================================

#[derive(Accounts)]
pub struct SetHubActive<'info> {
    #[account(
        constraint = admin.key() == platform_config.admin @ DeepPulseError::UnauthorizedAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(mut)]
    pub hub: Account<'info, Hub>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

pub fn set_hub_active(ctx: Context<SetHubActive>, is_active: bool) -> Result<()> {
    ctx.accounts.hub.is_active = is_active;

    let clock = Clock::get()?;
    emit!(HubActiveChanged {
        hub: ctx.accounts.hub.key(),
        is_active,
        changed_by: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
