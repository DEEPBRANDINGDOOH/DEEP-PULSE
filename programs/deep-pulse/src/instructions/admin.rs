use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

use crate::constants::*;
use crate::errors::DeepPulseError;
use crate::events::{PlatformConfigUpdated, PlatformInitialized};
use crate::state::PlatformConfig;

// ============================================
// INITIALIZE PLATFORM
// ============================================

#[derive(Accounts)]
pub struct InitializePlatform<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        init,
        payer = admin,
        space = PlatformConfig::LEN,
        seeds = [PLATFORM_CONFIG_SEED],
        bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// The existing $SKR token mint (SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3)
    pub skr_mint: Account<'info, Mint>,

    /// Treasury token account (ATA owned by treasury PDA)
    /// CHECK: This is the treasury PDA, validated by seeds
    #[account(
        seeds = [TREASURY_SEED],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    /// Treasury $SKR token account
    #[account(
        init,
        payer = admin,
        token::mint = skr_mint,
        token::authority = treasury,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn initialize_platform(
    ctx: Context<InitializePlatform>,
    hub_subscription_price: Option<u64>,
    feedback_deposit: Option<u64>,
    dao_proposal_deposit: Option<u64>,
    talent_deposit: Option<u64>,
    top_ad_price_per_week: Option<u64>,
    bottom_ad_price_per_week: Option<u64>,
    dao_brand_share_bps: Option<u16>,
    dao_platform_share_bps: Option<u16>,
    min_vault_contribution: Option<u64>,
) -> Result<()> {
    let brand_bps = dao_brand_share_bps.unwrap_or(DEFAULT_DAO_BRAND_SHARE_BPS);
    let platform_bps = dao_platform_share_bps.unwrap_or(DEFAULT_DAO_PLATFORM_SHARE_BPS);

    require!(
        brand_bps.checked_add(platform_bps).ok_or(DeepPulseError::MathOverflow)? == 10000,
        DeepPulseError::InvalidShareConfig
    );

    let config = &mut ctx.accounts.platform_config;
    config.admin = ctx.accounts.admin.key();
    config.treasury = ctx.accounts.treasury.key();
    config.skr_mint = ctx.accounts.skr_mint.key();
    config.hub_subscription_price = hub_subscription_price.unwrap_or(DEFAULT_HUB_SUBSCRIPTION_PRICE);
    config.feedback_deposit = feedback_deposit.unwrap_or(DEFAULT_FEEDBACK_DEPOSIT);
    config.dao_proposal_deposit = dao_proposal_deposit.unwrap_or(DEFAULT_DAO_PROPOSAL_DEPOSIT);
    config.talent_deposit = talent_deposit.unwrap_or(DEFAULT_TALENT_DEPOSIT);
    config.top_ad_price_per_week = top_ad_price_per_week.unwrap_or(DEFAULT_TOP_AD_PRICE_PER_WEEK);
    config.bottom_ad_price_per_week = bottom_ad_price_per_week.unwrap_or(DEFAULT_BOTTOM_AD_PRICE_PER_WEEK);
    config.dao_brand_share_bps = brand_bps;
    config.dao_platform_share_bps = platform_bps;
    config.min_vault_contribution = min_vault_contribution.unwrap_or(DEFAULT_MIN_VAULT_CONTRIBUTION);
    config.bump = ctx.bumps.platform_config;

    let clock = Clock::get()?;
    emit!(PlatformInitialized {
        admin: config.admin,
        treasury: config.treasury,
        skr_mint: config.skr_mint,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// UPDATE PLATFORM CONFIG
// ============================================

#[derive(Accounts)]
pub struct UpdatePlatformConfig<'info> {
    #[account(
        constraint = admin.key() == platform_config.admin @ DeepPulseError::UnauthorizedAdmin,
    )]
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

// ============================================
// TRANSFER ADMIN (current admin + new admin must both sign)
// ============================================

#[derive(Accounts)]
pub struct TransferAdmin<'info> {
    #[account(
        constraint = current_admin.key() == platform_config.admin @ DeepPulseError::UnauthorizedAdmin,
    )]
    pub current_admin: Signer<'info>,

    pub new_admin: Signer<'info>,

    #[account(
        mut,
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,
}

pub fn transfer_admin(ctx: Context<TransferAdmin>) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;
    let old_admin = config.admin;
    config.admin = ctx.accounts.new_admin.key();

    let clock = Clock::get()?;
    emit!(PlatformConfigUpdated {
        admin: config.admin,
        timestamp: clock.unix_timestamp,
    });

    msg!(
        "Admin transferred from {} to {}",
        old_admin,
        config.admin
    );

    Ok(())
}

pub fn update_platform_config(
    ctx: Context<UpdatePlatformConfig>,
    hub_subscription_price: Option<u64>,
    feedback_deposit: Option<u64>,
    dao_proposal_deposit: Option<u64>,
    talent_deposit: Option<u64>,
    top_ad_price_per_week: Option<u64>,
    bottom_ad_price_per_week: Option<u64>,
    dao_brand_share_bps: Option<u16>,
    dao_platform_share_bps: Option<u16>,
    min_vault_contribution: Option<u64>,
) -> Result<()> {
    let config = &mut ctx.accounts.platform_config;

    // If either share is updated, validate the pair
    if dao_brand_share_bps.is_some() || dao_platform_share_bps.is_some() {
        let brand_bps = dao_brand_share_bps.unwrap_or(config.dao_brand_share_bps);
        let platform_bps = dao_platform_share_bps.unwrap_or(config.dao_platform_share_bps);

        require!(
            brand_bps.checked_add(platform_bps).ok_or(DeepPulseError::MathOverflow)? == 10000,
            DeepPulseError::InvalidShareConfig
        );

        config.dao_brand_share_bps = brand_bps;
        config.dao_platform_share_bps = platform_bps;
    }

    if let Some(v) = hub_subscription_price {
        config.hub_subscription_price = v;
    }
    if let Some(v) = feedback_deposit {
        config.feedback_deposit = v;
    }
    if let Some(v) = dao_proposal_deposit {
        config.dao_proposal_deposit = v;
    }
    if let Some(v) = talent_deposit {
        config.talent_deposit = v;
    }
    if let Some(v) = top_ad_price_per_week {
        config.top_ad_price_per_week = v;
    }
    if let Some(v) = bottom_ad_price_per_week {
        config.bottom_ad_price_per_week = v;
    }
    if let Some(v) = min_vault_contribution {
        config.min_vault_contribution = v;
    }

    let clock = Clock::get()?;
    emit!(PlatformConfigUpdated {
        admin: ctx.accounts.admin.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
