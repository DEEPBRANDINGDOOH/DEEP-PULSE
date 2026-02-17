use anchor_lang::prelude::*;

// === Platform Events ===

#[event]
pub struct PlatformInitialized {
    pub admin: Pubkey,
    pub treasury: Pubkey,
    pub skr_mint: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PlatformConfigUpdated {
    pub admin: Pubkey,
    pub timestamp: i64,
}

// === Hub Events ===

#[event]
pub struct HubCreated {
    pub hub: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub category: u8,
    pub hub_index: u32,
    pub timestamp: i64,
}

#[event]
pub struct HubSubscriptionRenewed {
    pub hub: Pubkey,
    pub creator: Pubkey,
    pub paid_until: i64,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct UserSubscribed {
    pub user: Pubkey,
    pub hub: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UserUnsubscribed {
    pub user: Pubkey,
    pub hub: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct HubVerifiedChanged {
    pub hub: Pubkey,
    pub is_verified: bool,
    pub changed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct HubActiveChanged {
    pub hub: Pubkey,
    pub is_active: bool,
    pub changed_by: Pubkey,
    pub timestamp: i64,
}

// === Deposit Events ===

#[event]
pub struct DepositCreated {
    pub deposit: Pubkey,
    pub depositor: Pubkey,
    pub hub: Pubkey,
    pub deposit_type: u8,
    pub amount: u64,
    pub deposit_index: u32,
    pub timestamp: i64,
}

#[event]
pub struct DepositApproved {
    pub deposit: Pubkey,
    pub depositor: Pubkey,
    pub resolver: Pubkey,
    pub deposit_type: u8,
    pub amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct DepositRejected {
    pub deposit: Pubkey,
    pub depositor: Pubkey,
    pub resolver: Pubkey,
    pub deposit_type: u8,
    pub amount: u64,
    pub timestamp: i64,
}

// === DAO Vault Events ===

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub hub: Pubkey,
    pub creator: Pubkey,
    pub brand: Pubkey,
    pub target_amount: u64,
    pub expires_at: i64,
    pub vault_index: u32,
    pub timestamp: i64,
}

#[event]
pub struct VaultContributed {
    pub vault: Pubkey,
    pub contributor: Pubkey,
    pub amount: u64,
    pub current_total: u64,
    pub target_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct VaultCompleted {
    pub vault: Pubkey,
    pub brand: Pubkey,
    pub brand_amount: u64,
    pub platform_fee: u64,
    pub total_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct VaultCancelled {
    pub vault: Pubkey,
    pub cancelled_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct VaultRefunded {
    pub vault: Pubkey,
    pub contributor: Pubkey,
    pub refund_amount: u64,
    pub timestamp: i64,
}

// === Ad Slot Events ===

#[event]
pub struct AdSlotPurchased {
    pub ad_slot: Pubkey,
    pub hub: Pubkey,
    pub advertiser: Pubkey,
    pub slot_type: u8,
    pub amount_paid: u64,
    pub duration_weeks: u8,
    pub discount_bps: u16,
    pub timestamp: i64,
}

#[event]
pub struct AdSlotUpdated {
    pub ad_slot: Pubkey,
    pub advertiser: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AdSlotExpired {
    pub ad_slot: Pubkey,
    pub hub: Pubkey,
    pub timestamp: i64,
}

// === Scoring Events ===

#[event]
pub struct ActionRecorded {
    pub user: Pubkey,
    pub action_type: u8,
    pub score_delta: u32,
    pub new_total_score: u32,
    pub timestamp: i64,
}
