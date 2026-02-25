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
    /// Total composite score (scale: 0-10000)
    pub total_score: u32,
    /// --- On-chain action counters ---
    /// Number of DAO boost contributions
    pub dao_boost_count: u16,
    /// Number of talent submissions
    pub talent_submit_count: u16,
    /// Number of feedback submissions
    pub feedback_count: u16,
    /// Number of hub subscriptions
    pub subscribe_count: u16,
    /// Number of hubs created
    pub hub_creation_count: u16,
    /// Number of DAO proposal votes
    pub proposal_vote_count: u16,
    /// --- Off-chain action counters (synced periodically) ---
    /// Notification read count
    pub notification_read_count: u16,
    /// Ad click count
    pub ad_click_count: u16,
    /// Lockscreen swipe count (skip + engage)
    pub swipe_count: u16,
    /// --- Streak & time tracking ---
    /// Unix timestamp of last on-chain activity
    pub last_activity: i64,
    /// Consecutive days of on-chain activity
    pub streak_days: u16,
    /// Last day (unix day number) user was active
    pub last_active_day: u32,
    /// --- Score modifiers ---
    /// Bitmask of action types used (for diversity bonus)
    pub action_types_used: u8,
    /// PDA bump
    pub bump: u8,
}

impl UserScore {
    /// 8 (discriminator) + 32 (pubkey) + 4 (total_score)
    /// + 2*9 (action counters) + 8 (last_activity)
    /// + 2 (streak_days) + 4 (last_active_day)
    /// + 1 (action_types_used) + 1 (bump) = 76
    pub const LEN: usize = 8 + 32 + 4 + 2 * 9 + 8 + 2 + 4 + 1 + 1;
}
