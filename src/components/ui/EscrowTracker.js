/**
 * EscrowTracker — shows the user's locked $SKR across pending submissions.
 *
 * Sums feedback (300 $SKR each), talent (50 $SKR each), and DAO proposals (100 $SKR each)
 * that are still pending approval. Funds refund automatically when approved.
 *
 * Usage:
 *   <EscrowTracker />  — on Profile screen
 */
import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useAppStore } from '../../store/appStore';
import { DEPOSITS } from '../../config/constants';

export default function EscrowTracker() {
  const talentSubmissions = useAppStore((state) => state.talentSubmissions) || [];
  const daoProposals = useAppStore((state) => state.daoProposals) || [];
  const hubFeedbacks = useAppStore((state) => state.hubFeedbacks) || {};

  const breakdown = useMemo(() => {
    // Count PENDING submissions only (status=pending_review, REVIEW, pending)
    const isPending = (s) => {
      const st = String(s || 'pending').toLowerCase();
      return st === 'pending' || st === 'pending_review' || st === 'review';
    };

    const pendingTalents = talentSubmissions.filter(t => isPending(t.status)).length;
    const pendingProposals = daoProposals.filter(p => isPending(p.status)).length;
    const pendingFeedbacks = Object.values(hubFeedbacks || {})
      .flat()
      .filter(f => isPending(f.status)).length;

    const feedbackLocked = pendingFeedbacks * DEPOSITS.FEEDBACK;
    const talentLocked = pendingTalents * DEPOSITS.TALENT;
    const proposalLocked = pendingProposals * DEPOSITS.DAO_PROPOSAL;
    const total = feedbackLocked + talentLocked + proposalLocked;

    return {
      pendingFeedbacks,
      pendingTalents,
      pendingProposals,
      feedbackLocked,
      talentLocked,
      proposalLocked,
      total,
    };
  }, [talentSubmissions, daoProposals, hubFeedbacks]);

  if (breakdown.total === 0) {
    // Nothing locked — don't clutter the profile
    return null;
  }

  return (
    <View
      className="bg-background-card rounded-2xl p-5 mb-4 border border-border overflow-hidden"
      style={{
        shadowColor: '#FF9F66',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
      }}
    >
      {/* Orange accent line */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundColor: '#FF9F66',
          opacity: 0.7,
        }}
      />

      <View className="flex-row items-center mb-3">
        <View
          className="w-9 h-9 rounded-full items-center justify-center"
          style={{ backgroundColor: 'rgba(255,159,102,0.15)' }}
        >
          <Ionicons name="lock-closed" size={18} color="#FF9F66" />
        </View>
        <View className="ml-3 flex-1">
          <Text className="text-text font-sans-bold text-base">Locked in Escrow</Text>
          <Text className="text-text-muted text-xs">Refunded when approved</Text>
        </View>
        <Text className="text-primary font-black text-xl">
          {breakdown.total.toLocaleString()}
        </Text>
      </View>

      {/* Breakdown rows */}
      {breakdown.pendingFeedbacks > 0 && (
        <Row
          icon="chatbubble-ellipses"
          label="Feedback"
          count={breakdown.pendingFeedbacks}
          amount={breakdown.feedbackLocked}
        />
      )}
      {breakdown.pendingTalents > 0 && (
        <Row
          icon="star"
          label="Talent"
          count={breakdown.pendingTalents}
          amount={breakdown.talentLocked}
        />
      )}
      {breakdown.pendingProposals > 0 && (
        <Row
          icon="trending-up"
          label="DAO Proposals"
          count={breakdown.pendingProposals}
          amount={breakdown.proposalLocked}
        />
      )}
    </View>
  );
}

function Row({ icon, label, count, amount }) {
  return (
    <View className="flex-row items-center justify-between py-2 border-t border-border-soft">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color="#9898a0" />
        <Text className="text-text-secondary text-sm ml-2">{label}</Text>
        <Text className="text-text-muted text-xs ml-2">× {count}</Text>
      </View>
      <Text className="text-text font-sans-semibold text-sm">
        {amount.toLocaleString()} $SKR
      </Text>
    </View>
  );
}
