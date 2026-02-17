use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[repr(u8)]
pub enum ActionType {
    Subscribe = 0,
    Feedback = 1,
    TalentSubmit = 2,
    DaoBoost = 3,
}

#[account]
#[derive(Debug)]
pub struct UserScore {
    /// User public key
    pub user: Pubkey,
    /// Total composite score
    pub total_score: u32,
    /// Number of DAO boost contributions
    pub dao_boost_count: u16,
    /// Number of talent submissions
    pub talent_submit_count: u16,
    /// Number of feedback submissions
    pub feedback_count: u16,
    /// Number of hub subscriptions
    pub subscribe_count: u16,
    /// Notification read count (updated off-chain, synced periodically)
    pub notification_read_count: u16,
    /// Ad click count (updated off-chain, synced periodically)
    pub ad_click_count: u16,
    /// Unix timestamp of last on-chain activity
    pub last_activity: i64,
    /// Bitmask of action types used (for diversity bonus)
    pub action_types_used: u8,
    /// PDA bump
    pub bump: u8,
}

impl UserScore {
    /// 8 + 32 + 4 + 6*2 + 8 + 1 + 1 = 66
    pub const LEN: usize = 8 + 32 + 4 + 2 * 6 + 8 + 1 + 1;
}
