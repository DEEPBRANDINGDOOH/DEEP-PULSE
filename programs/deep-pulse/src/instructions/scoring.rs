use anchor_lang::prelude::*;

use crate::constants::*;
use crate::state::UserScore;

// ============================================
// INIT USER SCORE (create score account for a user)
// ============================================

#[derive(Accounts)]
pub struct InitUserScore<'info> {
    #[account(mut)]
    pub user: Signer<'info>,

    #[account(
        init,
        payer = user,
        space = UserScore::LEN,
        seeds = [USER_SCORE_SEED, user.key().as_ref()],
        bump,
    )]
    pub user_score: Account<'info, UserScore>,

    pub system_program: Program<'info, System>,
}

pub fn init_user_score(ctx: Context<InitUserScore>) -> Result<()> {
    let clock = Clock::get()?;
    let score = &mut ctx.accounts.user_score;
    score.user = ctx.accounts.user.key();
    score.total_score = 0;
    // On-chain counters
    score.dao_boost_count = 0;
    score.talent_submit_count = 0;
    score.feedback_count = 0;
    score.subscribe_count = 0;
    score.hub_creation_count = 0;
    score.proposal_vote_count = 0;
    // Off-chain counters
    score.notification_read_count = 0;
    score.ad_click_count = 0;
    score.swipe_count = 0;
    // Streak & time
    score.last_activity = clock.unix_timestamp;
    score.streak_days = 0;
    score.last_active_day = (clock.unix_timestamp / 86400) as u32;
    // Modifiers
    score.action_types_used = 0;
    score.bump = ctx.bumps.user_score;

    Ok(())
}
