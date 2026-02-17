use anchor_lang::prelude::*;

#[account]
#[derive(Debug)]
pub struct PlatformConfig {
    /// Admin public key (can update config)
    pub admin: Pubkey,
    /// Treasury PDA (receives platform fees)
    pub treasury: Pubkey,
    /// $SKR token mint address (existing: SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3)
    pub skr_mint: Pubkey,

    // === Pricing ===
    /// Hub creation/subscription price in $SKR smallest units
    pub hub_subscription_price: u64,
    /// Feedback deposit amount
    pub feedback_deposit: u64,
    /// DAO proposal deposit amount
    pub dao_proposal_deposit: u64,
    /// Talent submission deposit amount
    pub talent_deposit: u64,

    // === Ad Slot Pricing ===
    /// Top ad slot price per week
    pub top_ad_price_per_week: u64,
    /// Bottom ad slot price per week
    pub bottom_ad_price_per_week: u64,

    // === DAO Vault Split ===
    /// Brand share in basis points (e.g. 9500 = 95%)
    pub dao_brand_share_bps: u16,
    /// Platform share in basis points (e.g. 500 = 5%)
    pub dao_platform_share_bps: u16,

    /// Minimum vault contribution amount
    pub min_vault_contribution: u64,

    /// PDA bump
    pub bump: u8,
}

impl PlatformConfig {
    /// Account discriminator (8) + fields:
    /// 3 * Pubkey(32) + 6 * u64(8) + 2 * u16(2) + 1 * u64(8) + 1 * u8(1)
    /// = 8 + 96 + 48 + 4 + 8 + 1 = 165
    pub const LEN: usize = 8 + 32 * 3 + 8 * 7 + 2 * 2 + 1;
}
