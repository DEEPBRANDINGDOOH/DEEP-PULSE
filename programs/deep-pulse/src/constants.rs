/// PDA Seeds
pub const PLATFORM_CONFIG_SEED: &[u8] = b"platform_config";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const HUB_SEED: &[u8] = b"hub";
pub const SUBSCRIPTION_SEED: &[u8] = b"subscription";
pub const DEPOSIT_SEED: &[u8] = b"deposit";
pub const ESCROW_SEED: &[u8] = b"escrow";
pub const VAULT_SEED: &[u8] = b"vault";
pub const VAULT_TOKEN_SEED: &[u8] = b"vault_token";
pub const CONTRIBUTION_SEED: &[u8] = b"contribution";
pub const AD_SLOT_SEED: &[u8] = b"ad_slot";
pub const USER_SCORE_SEED: &[u8] = b"user_score";

/// $SKR Token — EXISTING mint on Solana
/// Mint address: SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3
pub const SKR_DECIMALS: u8 = 6;

/// Default pricing (in $SKR smallest unit = 10^-6)
/// 2000 $SKR = 2_000_000_000 smallest units
pub const DEFAULT_HUB_SUBSCRIPTION_PRICE: u64 = 2_000_000_000;
/// 400 $SKR
pub const DEFAULT_FEEDBACK_DEPOSIT: u64 = 400_000_000;
/// 100 $SKR
pub const DEFAULT_DAO_PROPOSAL_DEPOSIT: u64 = 100_000_000;
/// 50 $SKR
pub const DEFAULT_TALENT_DEPOSIT: u64 = 50_000_000;

/// Default ad slot prices per week
pub const DEFAULT_TOP_AD_PRICE_PER_WEEK: u64 = 500_000_000; // 500 $SKR
pub const DEFAULT_BOTTOM_AD_PRICE_PER_WEEK: u64 = 250_000_000; // 250 $SKR

/// DAO Vault split (basis points, total must = 10000)
pub const DEFAULT_DAO_BRAND_SHARE_BPS: u16 = 9500; // 95%
pub const DEFAULT_DAO_PLATFORM_SHARE_BPS: u16 = 500; // 5%

/// Minimum vault contribution
pub const DEFAULT_MIN_VAULT_CONTRIBUTION: u64 = 10_000_000; // 10 $SKR

/// Timing
pub const HUB_SUBSCRIPTION_DURATION_SECS: i64 = 30 * 24 * 60 * 60; // 30 days
pub const SECONDS_PER_WEEK: i64 = 7 * 24 * 60 * 60;
pub const MIN_VAULT_DURATION_SECS: i64 = 24 * 60 * 60; // 1 day minimum
pub const MAX_VAULT_DURATION_SECS: i64 = 365 * 24 * 60 * 60; // 1 year maximum

/// Limits
pub const MAX_HUB_NAME_LEN: usize = 64;
pub const MAX_HUB_DESCRIPTION_LEN: usize = 256;
pub const MAX_VAULT_TITLE_LEN: usize = 64;
pub const MAX_VAULT_DESCRIPTION_LEN: usize = 256;

/// Scoring coefficients
pub const SCORE_SUBSCRIBE: u32 = 10;
pub const SCORE_FEEDBACK: u32 = 25;
pub const SCORE_TALENT: u32 = 30;
pub const SCORE_DAO_BOOST: u32 = 50;
