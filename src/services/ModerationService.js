/**
 * DEEP Pulse - Moderation Service
 *
 * Handles brand moderation of deposits (feedback, talent, DAO proposals).
 * Now uses real on-chain program calls via programService instead of
 * simulated SystemProgram.transfer + AsyncStorage.
 *
 * Flow:
 * - User creates deposit → tokens locked in escrow PDA
 * - Brand approves → tokens refunded to user (or vault created for DAO)
 * - Brand rejects → tokens sent to platform treasury
 */

import { programService } from './programService';
import { logger } from '../utils/security';

class ModerationService {

  // ============================================
  // FEEDBACK MODERATION
  // ============================================

  async processFeedback(depositPda, hubPda, depositorPubkey, isUseful) {
    try {
      if (isUseful) {
        // FEEDBACK USEFUL → Approve (refund 300 $SKR to user)
        const result = await programService.approveFeedback(
          depositPda,
          hubPda,
          depositorPubkey
        );

        return {
          success: true,
          action: 'approved',
          refundAmount: 300,
          signature: result.signature,
          message: 'Feedback approved. User refunded 300 $SKR.',
        };
      } else {
        // FEEDBACK SPAM/USELESS → Reject (tokens to treasury)
        const result = await programService.rejectDeposit(
          depositPda,
          hubPda,
          depositorPubkey
        );

        return {
          success: true,
          action: 'rejected',
          platformRevenue: 300,
          signature: result.signature,
          message: 'Feedback rejected. No refund issued.',
        };
      }
    } catch (error) {
      logger.error('Error processing feedback:', error);
      throw error;
    }
  }

  // ============================================
  // BOOST PROPOSAL MODERATION
  // ============================================

  async processBoostProposal(
    depositPda,
    hubPda,
    depositorPubkey,
    isApproved,
    vaultParams
  ) {
    try {
      if (isApproved) {
        // PROPOSAL APPROVED → Refund 100 $SKR + Create DAO Vault
        const result = await programService.approveDaoProposal(
          depositPda,
          hubPda,
          depositorPubkey,
          vaultParams.vaultIndex,
          vaultParams.title,
          vaultParams.description,
          vaultParams.targetAmount,
          vaultParams.expiresAt
        );

        return {
          success: true,
          action: 'approved',
          refundAmount: 100,
          signature: result.signature,
          message: `Proposal approved. User refunded. DAO vault opened for ${vaultParams.targetAmount} $SKR.`,
        };
      } else {
        // PROPOSAL REJECTED → Tokens to treasury
        const result = await programService.rejectDeposit(
          depositPda,
          hubPda,
          depositorPubkey
        );

        return {
          success: true,
          action: 'rejected',
          platformRevenue: 100,
          signature: result.signature,
          message: 'Proposal rejected. No refund issued.',
        };
      }
    } catch (error) {
      logger.error('Error processing proposal:', error);
      throw error;
    }
  }

  // ============================================
  // TALENT SUBMISSION MODERATION
  // ============================================

  async processTalentSubmission(depositPda, hubPda, depositorPubkey, isRetained) {
    try {
      if (isRetained) {
        // TALENT RETAINED → Refund 50 $SKR
        const result = await programService.approveTalent(
          depositPda,
          hubPda,
          depositorPubkey
        );

        return {
          success: true,
          action: 'retained',
          refundAmount: 50,
          signature: result.signature,
          message: 'Talent retained. User refunded 50 $SKR.',
        };
      } else {
        // TALENT NOT RETAINED → Tokens to treasury
        const result = await programService.rejectDeposit(
          depositPda,
          hubPda,
          depositorPubkey
        );

        return {
          success: true,
          action: 'rejected',
          platformRevenue: 50,
          signature: result.signature,
          message: 'Talent not retained. No refund issued.',
        };
      }
    } catch (error) {
      logger.error('Error processing talent:', error);
      throw error;
    }
  }

  // ============================================
  // READ: Fetch pending deposits for a hub
  // ============================================

  async getPendingDeposits(hubPda) {
    try {
      const deposits = await programService.fetchPendingDepositsForHub(hubPda);
      return deposits.filter(d => d.account.status.pending !== undefined);
    } catch (error) {
      logger.error('Error fetching pending deposits:', error);
      return [];
    }
  }

  // ============================================
  // READ: Fetch open vaults for a hub
  // ============================================

  async getOpenVaults(hubPda) {
    try {
      const vaults = await programService.fetchOpenVaultsForHub(hubPda);
      return vaults.filter(v => v.account.status.open !== undefined);
    } catch (error) {
      logger.error('Error fetching vaults:', error);
      return [];
    }
  }

  // ============================================
  // READ: Fetch user's deposits
  // ============================================

  async getUserDeposits(userPubkey) {
    try {
      // Fetch all deposits where depositor = userPubkey
      // Note: In production, use getProgramAccounts with memcmp filter
      const idl = await programService.getIdl();
      if (!idl) return [];
      // This would need a proper implementation using the program's account methods
      return [];
    } catch (error) {
      logger.error('Error fetching user deposits:', error);
      return [];
    }
  }
}

export default new ModerationService();
