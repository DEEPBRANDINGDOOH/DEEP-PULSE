use anchor_lang::prelude::Pubkey;
use solana_program::pubkey;

/// PDA Seeds
pub const PLATFORM_CONFIG_SEED: &[u8] = b"platform_config";
pub const TREASURY_SEED: &[u8] = b"treasury";
pub const HUB_SEED: &[u8] = b"hub";
pub const SUBSCRIPTION_SEED: &[u8] = b"subscription";
pub const DEPOSIT_SEED: &[u8] = b"deposit";
pub const ESCROW_SEED: &[u8] = b"escrow";
pub const ESCROW_AUTHORITY_SEED: &[u8] = b"escrow_auth"; // [C-02 FIX] Distinct seed for escrow authority
pub const VAULT_SEED: &[u8] = b"vault";
pub const VAULT_TOKEN_SEED: &[u8] = b"vault_token";
pub const VAULT_AUTHORITY_SEED: &[u8] = b"vault_authority";
pub const CONTRIBUTION_SEED: &[u8] = b"contribution";
pub const AD_SLOT_SEED: &[u8] = b"ad_slot";
pub const USER_SCORE_SEED: &[u8] = b"user_score";

/// $SKR Token — EXISTING mint on Solana [H-01 FIX] Hardcoded for on-chain validation
pub const SKR_MINT: Pubkey = pubkey!("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");
pub const SKR_DECIMALS: u8 = 6;

/// Ad slot limits [L-01 FIX]
pub const MAX_AD_SLOTS_PER_TYPE: u8 = 20;

/// Default pricing (in $SKR smallest unit = 10^-6)
/// 2000 $SKR = 2_000_000_000 smallest units
pub const DEFAULT_HUB_SUBSCRIPTION_PRICE: u64 = 2_000_000_000;
/// 300 $SKR — aligned with frontend PRICING.FEEDBACK
pub const DEFAULT_FEEDBACK_DEPOSIT: u64 = 300_000_000;
/// 100 $SKR
pub const DEFAULT_DAO_PROPOSAL_DEPOSIT: u64 = 100_000_000;
/// 50 $SKR
pub const DEFAULT_TALENT_DEPOSIT: u64 = 50_000_000;

/// Default ad slot prices per week — aligned with frontend PRICING
pub const DEFAULT_TOP_AD_PRICE_PER_WEEK: u64 = 1_500_000_000; // 1500 $SKR
pub const DEFAULT_BOTTOM_AD_PRICE_PER_WEEK: u64 = 800_000_000; // 800 $SKR

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

/// Scoring coefficients v2 — harder to farm, rewards real engagement
/// On-chain actions (high value)
pub const SCORE_DAO_BOOST: u32 = 50;       // Direct financial contribution to DAO
pub const SCORE_HUB_CREATION: u32 = 40;    // Creates ecosystem value
pub const SCORE_TALENT: u32 = 25;          // Demonstrates expertise
pub const SCORE_FEEDBACK: u32 = 15;        // Real engagement with hub
/// Social actions (medium value)
pub const SCORE_SUBSCRIBE: u32 = 5;        // Easy action, low reward
pub const SCORE_PROPOSAL_VOTE: u32 = 8;    // DAO participation
/// Daily caps (prevent farming)
pub const DAILY_CAP_SWIPE_SCORE: u32 = 3;  // Max 3 pts/day from lockscreen
pub const DAILY_CAP_READ_SCORE: u32 = 5;   // Max 5 pts/day from reading
pub const DAILY_CAP_AD_CLICK_SCORE: u32 = 3; // Max 3 pts/day from ad clicks
/// Diminishing returns threshold
pub const DIMINISHING_THRESHOLD_DAO: u16 = 5;
pub const DIMINISHING_THRESHOLD_TALENT: u16 = 3;
pub const DIMINISHING_THRESHOLD_FEEDBACK: u16 = 10;
