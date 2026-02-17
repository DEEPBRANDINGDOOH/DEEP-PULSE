use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum VaultStatus {
    /// Open for contributions
    Open = 0,
    /// Target amount reached, funds distributed
    Funded = 1,
    /// Expired without reaching target
    Expired = 2,
    /// Cancelled by brand or admin
    Cancelled = 3,
    /// Refunds have been processed (after cancel/expire)
    Refunded = 4,
}

#[account]
#[derive(Debug)]
pub struct DaoVault {
    /// Reference to the proposal deposit that created this vault
    pub proposal_deposit: Pubkey,
    /// Hub this vault belongs to
    pub hub: Pubkey,
    /// User who proposed the boost
    pub creator: Pubkey,
    /// Brand wallet (hub creator) — receives 95% on completion
    pub brand: Pubkey,
    /// Vault title (max 64 chars)
    pub title: String,
    /// Vault description (max 256 chars)
    pub description: String,
    /// Target amount in $SKR smallest units
    pub target_amount: u64,
    /// Current contributed amount
    pub current_amount: u64,
    /// Number of unique contributors
    pub contributor_count: u32,
    /// Current vault status
    pub status: VaultStatus,
    /// Unix timestamp of creation
    pub created_at: i64,
    /// Unix timestamp when target was reached (0 if not yet funded)
    pub funded_at: i64,
    /// Unix timestamp when vault expires
    pub expires_at: i64,
    /// Vault index (for PDA derivation)
    pub vault_index: u32,
    /// PDA bump
    pub bump: u8,
}

impl DaoVault {
    /// 8 + 32*4 + (4+64) + (4+256) + 8*2 + 4 + 1 + 8*3 + 4 + 1
    pub const LEN: usize = 8 + 32 * 4 + (4 + 64) + (4 + 256) + 8 * 2 + 4 + 1 + 8 * 3 + 4 + 1;
}

#[account]
#[derive(Debug)]
pub struct VaultContribution {
    /// Contributor public key
    pub contributor: Pubkey,
    /// Vault PDA
    pub vault: Pubkey,
    /// Amount contributed in $SKR smallest units
    pub amount: u64,
    /// Unix timestamp of contribution
    pub contributed_at: i64,
    /// Whether this contribution has been refunded (on cancel/expire)
    pub refunded: bool,
    /// PDA bump
    pub bump: u8,
}

impl VaultContribution {
    /// 8 + 32 + 32 + 8 + 8 + 1 + 1 = 90
    pub const LEN: usize = 8 + 32 + 32 + 8 + 8 + 1 + 1;
}
