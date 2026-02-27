use anchor_lang::prelude::*;

// Re-export solana_program at crate root — required by the pubkey! macro
pub use anchor_lang::solana_program;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;
use state::{DepositType, HubCategory, SlotType};

declare_id!("33vWX6efKQSZ98dk3bnbHUjEYhB7LyvbH4ndpKjC6iY4");

#[program]
pub mod deep_pulse {
    use super::*;

    // ============================================
    // ADMIN INSTRUCTIONS
    // ============================================

    /// Initialize the platform configuration (one-time setup)
    /// Uses the existing $SKR mint: SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
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
        instructions::admin::initialize_platform(
            ctx,
            hub_subscription_price,
            feedback_deposit,
            dao_proposal_deposit,
            talent_deposit,
            top_ad_price_per_week,
            bottom_ad_price_per_week,
            dao_brand_share_bps,
            dao_platform_share_bps,
            min_vault_contribution,
        )
    }

    /// Transfer admin role (both current and new admin must sign)
    pub fn transfer_admin(ctx: Context<TransferAdmin>) -> Result<()> {
        instructions::admin::transfer_admin(ctx)
    }

    /// Update platform configuration (admin only)
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
        instructions::admin::update_platform_config(
            ctx,
            hub_subscription_price,
            feedback_deposit,
            dao_proposal_deposit,
            talent_deposit,
            top_ad_price_per_week,
            bottom_ad_price_per_week,
            dao_brand_share_bps,
            dao_platform_share_bps,
            min_vault_contribution,
        )
    }

    // ============================================
    // HUB INSTRUCTIONS
    // ============================================

    /// Create a new hub (brand pays 2000 $SKR subscription)
    pub fn create_hub(
        ctx: Context<CreateHub>,
        name: String,
        description: String,
        category: HubCategory,
        hub_index: u32,
    ) -> Result<()> {
        instructions::hub::create_hub(ctx, name, description, category, hub_index)
    }

    /// Renew hub subscription (+30 days, 2000 $SKR)
    pub fn renew_hub_subscription(ctx: Context<RenewHubSubscription>) -> Result<()> {
        instructions::hub::renew_hub_subscription(ctx)
    }

    /// Subscribe to a hub (user, free in $SKR — only rent cost)
    pub fn subscribe_to_hub(ctx: Context<SubscribeToHub>) -> Result<()> {
        instructions::hub::subscribe_to_hub(ctx)
    }

    /// Unsubscribe from a hub (rent returned)
    pub fn unsubscribe_from_hub(ctx: Context<UnsubscribeFromHub>) -> Result<()> {
        instructions::hub::unsubscribe_from_hub(ctx)
    }

    /// Set hub verified status (admin only)
    pub fn set_hub_verified(ctx: Context<SetHubVerified>, is_verified: bool) -> Result<()> {
        instructions::hub::set_hub_verified(ctx, is_verified)
    }

    /// Set hub active status (admin only)
    pub fn set_hub_active(ctx: Context<SetHubActive>, is_active: bool) -> Result<()> {
        instructions::hub::set_hub_active(ctx, is_active)
    }

    // ============================================
    // DEPOSIT / ESCROW INSTRUCTIONS
    // ============================================

    /// Create a deposit (feedback=300, dao_proposal=100, talent=50 $SKR)
    /// Tokens locked in escrow PDA until brand moderates
    pub fn create_deposit(
        ctx: Context<CreateDeposit>,
        deposit_type: DepositType,
        content_hash: [u8; 32],
        deposit_index: u32,
    ) -> Result<()> {
        instructions::deposit::create_deposit(ctx, deposit_type, content_hash, deposit_index)
    }

    /// Approve feedback — refund deposit to user
    pub fn approve_feedback(ctx: Context<ApproveFeedback>) -> Result<()> {
        instructions::deposit::approve_feedback(ctx)
    }

    /// Approve DAO proposal — refund + create vault
    pub fn approve_dao_proposal(
        ctx: Context<ApproveDaoProposal>,
        vault_index: u32,
        title: String,
        description: String,
        target_amount: u64,
        expires_at: i64,
    ) -> Result<()> {
        instructions::deposit::approve_dao_proposal(
            ctx,
            vault_index,
            title,
            description,
            target_amount,
            expires_at,
        )
    }

    /// Approve talent submission — refund deposit to user
    pub fn approve_talent(ctx: Context<ApproveTalent>) -> Result<()> {
        instructions::deposit::approve_talent(ctx)
    }

    /// Reject any deposit — tokens go to platform treasury
    pub fn reject_deposit(ctx: Context<RejectDeposit>) -> Result<()> {
        instructions::deposit::reject_deposit(ctx)
    }

    // ============================================
    // DAO VAULT INSTRUCTIONS
    // ============================================

    /// Contribute $SKR to a DAO vault
    pub fn contribute_to_vault(ctx: Context<ContributeToVault>, amount: u64) -> Result<()> {
        instructions::dao_vault::contribute_to_vault(ctx, amount)
    }

    /// Complete a funded vault — 95% to brand, 5% to treasury
    pub fn complete_vault(ctx: Context<CompleteVault>) -> Result<()> {
        instructions::dao_vault::complete_vault(ctx)
    }

    /// Cancel a vault (brand or admin)
    pub fn cancel_vault(ctx: Context<CancelVault>) -> Result<()> {
        instructions::dao_vault::cancel_vault(ctx)
    }

    /// Expire a vault past its deadline (permissionless crank)
    pub fn expire_vault(ctx: Context<ExpireVault>) -> Result<()> {
        instructions::dao_vault::expire_vault(ctx)
    }

    /// Claim proportional refund from cancelled/expired vault
    pub fn claim_vault_refund(ctx: Context<ClaimVaultRefund>) -> Result<()> {
        instructions::dao_vault::claim_vault_refund(ctx)
    }

    // ============================================
    // AD SLOT INSTRUCTIONS
    // ============================================

    /// Purchase an ad slot (with duration discount)
    pub fn purchase_ad_slot(
        ctx: Context<PurchaseAdSlot>,
        slot_type: SlotType,
        slot_index: u8,
        image_url_hash: [u8; 32],
        landing_url_hash: [u8; 32],
        duration_weeks: u8,
    ) -> Result<()> {
        instructions::ad_slot::purchase_ad_slot(
            ctx,
            slot_type,
            slot_index,
            image_url_hash,
            landing_url_hash,
            duration_weeks,
        )
    }

    /// Update ad slot creative (advertiser only)
    pub fn update_ad_slot(
        ctx: Context<UpdateAdSlot>,
        new_image_url_hash: [u8; 32],
        new_landing_url_hash: [u8; 32],
    ) -> Result<()> {
        instructions::ad_slot::update_ad_slot(ctx, new_image_url_hash, new_landing_url_hash)
    }

    /// Expire an ad slot (permissionless crank)
    pub fn expire_ad_slot(ctx: Context<ExpireAdSlot>) -> Result<()> {
        instructions::ad_slot::expire_ad_slot(ctx)
    }

    // ============================================
    // SCORING INSTRUCTIONS
    // ============================================

    /// Initialize user score account
    pub fn init_user_score(ctx: Context<InitUserScore>) -> Result<()> {
        instructions::scoring::init_user_score(ctx)
    }
}
