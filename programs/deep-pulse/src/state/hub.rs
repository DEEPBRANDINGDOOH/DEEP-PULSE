use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum HubCategory {
    DeFi = 0,
    NFT = 1,
    Gaming = 2,
    Social = 3,
    Infrastructure = 4,
    DAO = 5,
    DePIN = 6,
    Other = 7,
}

#[account]
#[derive(Debug)]
pub struct Hub {
    /// Creator (brand) public key
    pub creator: Pubkey,
    /// Hub name (max 64 chars)
    pub name: String,
    /// Hub description (max 256 chars)
    pub description: String,
    /// Hub category
    pub category: HubCategory,
    /// Number of subscribers
    pub subscriber_count: u32,
    /// Whether the hub is verified by admin
    pub is_verified: bool,
    /// Whether the hub is active
    pub is_active: bool,
    /// Unix timestamp until which subscription is paid
    pub subscription_paid_until: i64,
    /// Unix timestamp of creation
    pub created_at: i64,
    /// Hub index (for PDA derivation, auto-increment per creator)
    pub hub_index: u32,
    /// PDA bump
    pub bump: u8,
}

impl Hub {
    /// 8 (discriminator) + 32 (creator) + 4+64 (name) + 4+256 (desc)
    /// + 1 (category) + 4 (sub_count) + 1+1 (bools) + 8+8 (timestamps)
    /// + 4 (hub_index) + 1 (bump)
    pub const LEN: usize = 8 + 32 + (4 + 64) + (4 + 256) + 1 + 4 + 1 + 1 + 8 + 8 + 4 + 1;
}

#[account]
#[derive(Debug)]
pub struct HubSubscription {
    /// User who subscribed
    pub user: Pubkey,
    /// Hub PDA
    pub hub: Pubkey,
    /// Subscription timestamp
    pub subscribed_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl HubSubscription {
    /// 8 + 32 + 32 + 8 + 1 = 81
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;
}
