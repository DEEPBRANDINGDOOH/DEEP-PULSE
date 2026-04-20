/**
 * useRefreshFirebase — reusable hook for pull-to-refresh.
 *
 * Re-fetches hubs, notifications, ads, talents, feedbacks, proposals, subs, score
 * from Firestore and syncs them into the Zustand store. Same data pipeline as
 * App.js initial sync, just triggered on demand.
 *
 * Usage:
 *   const { refreshing, onRefresh } = useRefreshFirebase();
 *   <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF9F66" />} />
 */
import { useState, useCallback } from 'react';
import {
  fetchHubsFromFirestore,
  fetchPendingHubsFromFirestore,
  fetchNotificationsFromFirestore,
  fetchApprovedAdsFromFirestore,
  fetchTalentSubmissions,
  fetchDaoProposals,
  fetchHubFeedbacks,
  fetchPendingAdCreatives,
  fetchCustomDeals,
  fetchDoohCampaigns,
  fetchUserSubscriptions,
  fetchUserScore,
} from '../services/firebaseService';
import { useAppStore } from '../store/appStore';
import { haptics } from './haptics';
import { logger } from './security';

export function useRefreshFirebase() {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    haptics.select();

    try {
      const walletPk = useAppStore.getState().wallet?.publicKey;
      const walletStr =
        typeof walletPk === 'string'
          ? walletPk
          : walletPk?.toBase58?.() || walletPk?.toString?.() || null;

      const [
        hubs,
        pendingHubs,
        notifications,
        ads,
        talents,
        proposals,
        feedbacks,
        pendingAds,
        deals,
        dooh,
        userSubs,
        userScore,
      ] = await Promise.all([
        fetchHubsFromFirestore(),
        fetchPendingHubsFromFirestore(),
        fetchNotificationsFromFirestore(),
        fetchApprovedAdsFromFirestore(),
        fetchTalentSubmissions(),
        fetchDaoProposals(),
        fetchHubFeedbacks(),
        fetchPendingAdCreatives(),
        fetchCustomDeals(),
        fetchDoohCampaigns(),
        fetchUserSubscriptions(walletStr),
        fetchUserScore(walletStr),
      ]);

      const store = useAppStore.getState();
      if (hubs !== null && hubs !== undefined) store.syncHubsFromFirebase(hubs);
      if (pendingHubs !== null && pendingHubs !== undefined) store.syncPendingHubsFromFirebase(pendingHubs);
      if (notifications !== null && notifications !== undefined) store.syncNotificationsFromFirebase(notifications);
      if (ads !== null && ads !== undefined) store.syncAdsFromFirebase(ads);
      if (talents !== null && talents !== undefined) store.syncTalentSubmissions(talents);
      if (proposals !== null && proposals !== undefined) store.syncDaoProposals(proposals);
      if (feedbacks) store.syncHubFeedbacks(feedbacks);
      if (pendingAds !== null && pendingAds !== undefined) store.syncPendingAdCreatives(pendingAds);
      if (deals !== null && deals !== undefined) store.syncCustomDeals(deals);
      if (dooh !== null && dooh !== undefined) store.syncDoohCampaigns(dooh);

      if (userSubs && userSubs.length > 0) {
        // Only update if server has more data — don't overwrite local if server lost data
        const currentSubs = store.subscribedProjects || [];
        if (userSubs.length >= currentSubs.length) {
          store.setSubscribedProjects(userSubs);
        }
      }
      if (userScore && userScore.score != null) {
        if (userScore.score > (store.userScore || 0)) {
          store.setUserScore(userScore.score);
        }
        if (userScore.streak && userScore.streak > (store.userStreak || 0)) {
          store.setUserStreak(userScore.streak);
        }
      }

      haptics.success();
    } catch (e) {
      logger.warn('[useRefreshFirebase] refresh failed:', e?.message);
      haptics.error();
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh };
}

export default useRefreshFirebase;
