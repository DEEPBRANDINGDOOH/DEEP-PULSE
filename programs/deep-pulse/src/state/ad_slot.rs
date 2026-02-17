use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum SlotType {
    /// Top banner ad
    Top = 0,
    /// Bottom banner ad
    Bottom = 1,
}

#[account]
#[derive(Debug)]
pub struct AdSlot {
    /// Advertiser public key
    pub advertiser: Pubkey,
    /// Hub this ad belongs to
    pub hub: Pubkey,
    /// Type of ad slot
    pub slot_type: SlotType,
    /// SHA-256 hash of the ad image URL (stored off-chain)
    pub image_url_hash: [u8; 32],
    /// SHA-256 hash of the landing URL
    pub landing_url_hash: [u8; 32],
    /// Amount paid for this slot
    pub amount_paid: u64,
    /// Unix timestamp when the ad starts
    pub start_time: i64,
    /// Unix timestamp when the ad ends
    pub end_time: i64,
    /// Whether the slot is currently active
    pub is_active: bool,
    /// Slot index (allows multiple slots per hub per type)
    pub slot_index: u8,
    /// Unix timestamp of purchase
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

impl AdSlot {
    /// 8 + 32 + 32 + 1 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 8 + 1 = 172
    pub const LEN: usize = 8 + 32 + 32 + 1 + 32 + 32 + 8 + 8 + 8 + 1 + 1 + 8 + 1;
}

/// Calculate ad discount based on duration in weeks
/// Returns basis points (0 = no discount, 4000 = 40% off)
pub fn calculate_ad_discount(weeks: u8) -> u16 {
    if weeks >= 52 {
        4000 // 40% off for 1+ year
    } else if weeks >= 26 {
        3000 // 30% off for 6+ months
    } else if weeks >= 12 {
        2000 // 20% off for 3+ months
    } else if weeks >= 4 {
        1000 // 10% off for 1+ month
    } else {
        0 // No discount under 4 weeks
    }
}
