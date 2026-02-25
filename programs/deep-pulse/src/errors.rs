use anchor_lang::prelude::*;

#[error_code]
pub enum DeepPulseError {
    // === Admin ===
    #[msg("Only the platform admin can perform this action")]
    UnauthorizedAdmin,

    #[msg("Invalid share configuration: brand_bps + platform_bps must equal 10000")]
    InvalidShareConfig,

    // === Hub ===
    #[msg("Hub name exceeds maximum length of 64 characters")]
    HubNameTooLong,

    #[msg("Hub description exceeds maximum length of 256 characters")]
    HubDescriptionTooLong,

    #[msg("Hub subscription has expired")]
    HubSubscriptionExpired,

    #[msg("Hub is not active")]
    HubNotActive,

    #[msg("Only the hub creator can perform this action")]
    UnauthorizedHubCreator,

    #[msg("User is already subscribed to this hub")]
    AlreadySubscribed,

    // === Deposit ===
    #[msg("Invalid deposit type")]
    InvalidDepositType,

    #[msg("Deposit is not in pending status")]
    DepositNotPending,

    #[msg("Only the hub creator (brand) can moderate deposits")]
    UnauthorizedModerator,

    #[msg("Deposit type mismatch for this operation")]
    DepositTypeMismatch,

    // === DAO Vault ===
    #[msg("Vault title exceeds maximum length of 64 characters")]
    VaultTitleTooLong,

    #[msg("Vault description exceeds maximum length of 256 characters")]
    VaultDescriptionTooLong,

    #[msg("Vault is not open for contributions")]
    VaultNotOpen,

    #[msg("Vault has expired")]
    VaultExpired,

    #[msg("Contribution amount is below the minimum")]
    ContributionTooSmall,

    #[msg("Vault target amount has not been reached")]
    VaultTargetNotReached,

    #[msg("Vault target amount already reached")]
    VaultAlreadyFunded,

    #[msg("Only the brand or admin can cancel this vault")]
    UnauthorizedVaultCancel,

    #[msg("Vault is not in a refundable state")]
    VaultNotRefundable,

    #[msg("Contribution has already been refunded")]
    AlreadyRefunded,

    #[msg("No contribution found to refund")]
    NoContribution,

    // === Ad Slots ===
    #[msg("Invalid ad slot type")]
    InvalidSlotType,

    #[msg("Ad slot duration must be at least 1 week")]
    InvalidAdDuration,

    #[msg("Ad slot is still active and cannot be overwritten")]
    AdSlotStillActive,

    #[msg("Only the advertiser can update this ad slot")]
    UnauthorizedAdvertiser,

    #[msg("Ad slot has not expired yet")]
    AdSlotNotExpired,

    #[msg("Vault has not expired yet")]
    VaultNotExpired,

    #[msg("Vault expiry must be at least 1 day in the future")]
    VaultExpiryTooSoon,

    #[msg("Vault expiry must be at most 1 year in the future")]
    VaultExpiryTooFar,

    #[msg("Vault target amount must be greater than zero")]
    VaultTargetZero,

    #[msg("Contribution would exceed vault target amount")]
    ContributionExceedsTarget,

    // === Math ===
    #[msg("Arithmetic overflow")]
    MathOverflow,

    // === Token ===
    #[msg("Invalid $SKR token mint")]
    InvalidSkrMint,

    #[msg("Insufficient $SKR balance")]
    InsufficientBalance,

    // === Scoring ===
    #[msg("Score calculation overflow")]
    ScoreOverflow,

    // === Platform [M-05 FIX] ===
    #[msg("Platform is currently paused")]
    PlatformPaused,

    // === Validation [M-01, L-01 FIX] ===
    #[msg("Minimum vault contribution must be greater than zero")]
    MinContributionZero,

    #[msg("Ad slot index exceeds maximum allowed")]
    AdSlotIndexExceeded,
}
