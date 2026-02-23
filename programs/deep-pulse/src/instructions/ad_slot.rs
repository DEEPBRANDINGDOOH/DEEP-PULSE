use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::constants::*;
use crate::errors::DeepPulseError;
use crate::events::*;
use crate::state::{AdSlot, Hub, PlatformConfig, SlotType};
use crate::state::ad_slot::calculate_ad_discount;

// ============================================
// PURCHASE AD SLOT
// ============================================

#[derive(Accounts)]
#[instruction(slot_type: SlotType, slot_index: u8, image_url_hash: [u8; 32], landing_url_hash: [u8; 32], duration_weeks: u8)]
pub struct PurchaseAdSlot<'info> {
    #[account(mut)]
    pub advertiser: Signer<'info>,

    pub hub: Account<'info, Hub>,

    #[account(
        init,
        payer = advertiser,
        space = AdSlot::LEN,
        seeds = [AD_SLOT_SEED, hub.key().as_ref(), &[slot_type as u8], &[slot_index]],
        bump,
    )]
    pub ad_slot: Account<'info, AdSlot>,

    #[account(
        seeds = [PLATFORM_CONFIG_SEED],
        bump = platform_config.bump,
    )]
    pub platform_config: Account<'info, PlatformConfig>,

    /// Advertiser's $SKR token account
    #[account(
        mut,
        constraint = advertiser_token_account.owner == advertiser.key(),
        constraint = advertiser_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub advertiser_token_account: Account<'info, TokenAccount>,

    /// Treasury $SKR token account
    #[account(
        mut,
        constraint = treasury_token_account.owner == platform_config.treasury,
        constraint = treasury_token_account.mint == platform_config.skr_mint @ DeepPulseError::InvalidSkrMint,
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn purchase_ad_slot(
    ctx: Context<PurchaseAdSlot>,
    slot_type: SlotType,
    slot_index: u8,
    image_url_hash: [u8; 32],
    landing_url_hash: [u8; 32],
    duration_weeks: u8,
) -> Result<()> {
    require!(duration_weeks >= 1, DeepPulseError::InvalidAdDuration);
    require!(duration_weeks <= 52, DeepPulseError::InvalidAdDuration); // Max 1 year

    let config = &ctx.accounts.platform_config;
    let clock = Clock::get()?;

    // Calculate price
    let price_per_week = match slot_type {
        SlotType::Top => config.top_ad_price_per_week,
        SlotType::Bottom => config.bottom_ad_price_per_week,
    };

    let base_price = price_per_week
        .checked_mul(duration_weeks as u64)
        .ok_or(DeepPulseError::MathOverflow)?;

    // Apply duration discount
    let discount_bps = calculate_ad_discount(duration_weeks);
    let discount_amount = base_price
        .checked_mul(discount_bps as u64)
        .ok_or(DeepPulseError::MathOverflow)?
        .checked_div(10000)
        .ok_or(DeepPulseError::MathOverflow)?;

    let final_price = base_price
        .checked_sub(discount_amount)
        .ok_or(DeepPulseError::MathOverflow)?;

    // Transfer $SKR from advertiser → treasury
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.advertiser_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.advertiser.to_account_info(),
            },
        ),
        final_price,
    )?;

    // Initialize ad slot
    let start_time = clock.unix_timestamp;
    let end_time = start_time
        .checked_add(
            (duration_weeks as i64)
                .checked_mul(SECONDS_PER_WEEK)
                .ok_or(DeepPulseError::MathOverflow)?,
        )
        .ok_or(DeepPulseError::MathOverflow)?;

    let ad_slot = &mut ctx.accounts.ad_slot;
    ad_slot.advertiser = ctx.accounts.advertiser.key();
    ad_slot.hub = ctx.accounts.hub.key();
    ad_slot.slot_type = slot_type;
    ad_slot.image_url_hash = image_url_hash;
    ad_slot.landing_url_hash = landing_url_hash;
    ad_slot.amount_paid = final_price;
    ad_slot.start_time = start_time;
    ad_slot.end_time = end_time;
    ad_slot.is_active = true;
    ad_slot.slot_index = slot_index;
    ad_slot.created_at = clock.unix_timestamp;
    ad_slot.bump = ctx.bumps.ad_slot;

    emit!(AdSlotPurchased {
        ad_slot: ad_slot.key(),
        hub: ad_slot.hub,
        advertiser: ad_slot.advertiser,
        slot_type: slot_type as u8,
        amount_paid: final_price,
        duration_weeks,
        discount_bps,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// UPDATE AD SLOT (Advertiser changes creative)
// ============================================

#[derive(Accounts)]
pub struct UpdateAdSlot<'info> {
    #[account(
        constraint = advertiser.key() == ad_slot.advertiser @ DeepPulseError::UnauthorizedAdvertiser,
    )]
    pub advertiser: Signer<'info>,

    #[account(
        mut,
        constraint = ad_slot.is_active @ DeepPulseError::AdSlotNotExpired,
    )]
    pub ad_slot: Account<'info, AdSlot>,
}

pub fn update_ad_slot(
    ctx: Context<UpdateAdSlot>,
    new_image_url_hash: [u8; 32],
    new_landing_url_hash: [u8; 32],
) -> Result<()> {
    let ad_slot = &mut ctx.accounts.ad_slot;
    ad_slot.image_url_hash = new_image_url_hash;
    ad_slot.landing_url_hash = new_landing_url_hash;

    let clock = Clock::get()?;
    emit!(AdSlotUpdated {
        ad_slot: ad_slot.key(),
        advertiser: ad_slot.advertiser,
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}

// ============================================
// EXPIRE AD SLOT (permissionless crank after end_time)
// ============================================

#[derive(Accounts)]
pub struct ExpireAdSlot<'info> {
    /// Anyone can call this (permissionless crank)
    pub caller: Signer<'info>,

    #[account(
        mut,
        constraint = ad_slot.is_active,
    )]
    pub ad_slot: Account<'info, AdSlot>,

    pub hub: Account<'info, Hub>,
}

pub fn expire_ad_slot(ctx: Context<ExpireAdSlot>) -> Result<()> {
    let clock = Clock::get()?;

    require!(
        clock.unix_timestamp >= ctx.accounts.ad_slot.end_time,
        DeepPulseError::AdSlotNotExpired
    );

    let ad_slot = &mut ctx.accounts.ad_slot;
    ad_slot.is_active = false;

    emit!(AdSlotExpired {
        ad_slot: ad_slot.key(),
        hub: ctx.accounts.hub.key(),
        timestamp: clock.unix_timestamp,
    });

    Ok(())
}
