use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum DepositType {
    /// Feedback deposit — 300 $SKR
    Feedback = 0,
    /// DAO Boost Proposal deposit — 100 $SKR
    DaoProposal = 1,
    /// Talent submission deposit — 50 $SKR
    Talent = 2,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum DepositStatus {
    /// Awaiting brand moderation
    Pending = 0,
    /// Approved — tokens refunded to depositor
    Approved = 1,
    /// Rejected — tokens sent to platform treasury
    Rejected = 2,
}

#[account]
#[derive(Debug)]
pub struct Deposit {
    /// User who made the deposit
    pub depositor: Pubkey,
    /// Hub the deposit is associated with
    pub hub: Pubkey,
    /// Type of deposit (Feedback, DaoProposal, Talent)
    pub deposit_type: DepositType,
    /// Amount deposited in $SKR smallest units
    pub amount: u64,
    /// Current status
    pub status: DepositStatus,
    /// SHA-256 hash of the content (feedback text, proposal, CV, etc.)
    pub content_hash: [u8; 32],
    /// Unix timestamp of creation
    pub created_at: i64,
    /// Unix timestamp of resolution (approve/reject)
    pub resolved_at: i64,
    /// Public key of the moderator who resolved
    pub resolver: Pubkey,
    /// Deposit index (for PDA derivation, auto-increment per user)
    pub deposit_index: u32,
    /// PDA bump
    pub bump: u8,
}

impl Deposit {
    /// 8 (discriminator) + 32 (depositor) + 32 (hub) + 1 (type)
    /// + 8 (amount) + 1 (status) + 32 (hash) + 8 (created_at)
    /// + 8 (resolved_at) + 32 (resolver) + 4 (index) + 1 (bump)
    pub const LEN: usize = 8 + 32 + 32 + 1 + 8 + 1 + 32 + 8 + 8 + 32 + 4 + 1;
}
