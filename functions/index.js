/**
 * DEEP Pulse — Firebase Cloud Functions
 *
 * Backend functions for the DEEP Pulse Web3 Brand Engagement Platform.
 * All functions use Firestore as the primary database (free tier).
 *
 * Function categories:
 *   1. Notification Functions  — FCM push to hub subscribers
 *   2. Ad Slot Functions       — Creative upload pipeline + admin moderation
 *   3. Analytics Functions     — Event tracking + dashboard aggregation
 *   4. Moderation Functions    — User reports + auto-flagging
 *   5. Scheduled Functions     — Daily DEEP Score recalc + vault cleanup
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

const nacl = require("tweetnacl");
const bs58 = require("bs58");

admin.initializeApp();

const db = admin.firestore();
const messaging = admin.messaging();

// =====================================================================
//  CONSTANTS — mirror the client-side scoring algorithm
// =====================================================================

const SCORING_COEFFICIENTS = {
  DAO_BOOST: 50,
  HUB_CREATION: 40,
  TALENT_SUBMIT: 25,
  SEND_FEEDBACK: 15,
  SUBSCRIBE_HUB: 5,
  PROPOSAL_VOTE: 8,
  READ_NOTIFICATION: 0.5,
  CLICK_AD: 0.3,
  SWIPE_SKIP: 0.2,
  SWIPE_ENGAGE: 0.5,
};

const DAILY_CAPS = {
  SWIPE_POINTS: 3,
  READ_NOTIFICATION: 5,
  CLICK_AD: 3,
  SUBSCRIBE_HUB: 15,
};

const TIME_DECAY = {
  VERY_ACTIVE: 1.0,
  ACTIVE: 0.85,
  LESS_ACTIVE: 0.6,
  INACTIVE: 0.3,
};

const STREAK_BONUS = {
  NONE: 1.0,
  WEEK: 1.1,
  BIWEEK: 1.15,
  MONTH: 1.25,
  VETERAN: 1.4,
};

const DIVERSITY_MULTIPLIER = {
  COMPLETE_USER: 1.2,
  GOOD_ENGAGEMENT: 1.1,
  BASIC: 1.0,
};

const DIMINISHING_RETURNS = {
  DAO_BOOST: { threshold: 5, decay: 0.85 },
  TALENT_SUBMIT: { threshold: 3, decay: 0.80 },
  SEND_FEEDBACK: { threshold: 10, decay: 0.90 },
  SUBSCRIBE_HUB: { threshold: 8, decay: 0.75 },
};

// Simple bad-word list for auto-moderation (expand as needed)
const BAD_WORDS = [
  "scam", "rug pull", "rugpull", "ponzi", "hack",
  "phishing", "exploit", "steal", "fraud",
];

// Admin wallets — must match client-side ADMIN_WALLETS
const ADMIN_WALLETS = [
  "89Ez94pHfSNAUAPYrN7y3UmEfh4ggxr9biA4AS2nXVZc",
];

// =====================================================================
//  HELPERS
// =====================================================================

function isAdmin(walletAddress) {
  return ADMIN_WALLETS.includes(walletAddress);
}

function containsBadWords(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return BAD_WORDS.some((word) => lower.includes(word));
}

function calculateDeepScore(actions, recentActivityDays, actionTypesCount, streakDays) {
  let baseScore = 0;

  Object.keys(actions).forEach((actionType) => {
    const count = actions[actionType] || 0;
    const coefficient = SCORING_COEFFICIENTS[actionType] || 0;
    const dr = DIMINISHING_RETURNS[actionType];

    if (dr && count > dr.threshold) {
      baseScore += dr.threshold * coefficient;
      const extra = count - dr.threshold;
      let reduced = 0;
      for (let i = 0; i < extra; i++) {
        reduced += coefficient * Math.pow(dr.decay, i + 1);
      }
      baseScore += reduced;
    } else {
      baseScore += count * coefficient;
    }
  });

  // Time decay
  let decay = TIME_DECAY.INACTIVE;
  if (recentActivityDays <= 7) decay = TIME_DECAY.VERY_ACTIVE;
  else if (recentActivityDays <= 30) decay = TIME_DECAY.ACTIVE;
  else if (recentActivityDays <= 90) decay = TIME_DECAY.LESS_ACTIVE;

  // Diversity
  let diversity = DIVERSITY_MULTIPLIER.BASIC;
  if (actionTypesCount >= 5) diversity = DIVERSITY_MULTIPLIER.COMPLETE_USER;
  else if (actionTypesCount >= 3) diversity = DIVERSITY_MULTIPLIER.GOOD_ENGAGEMENT;

  // Streak
  let streak = STREAK_BONUS.NONE;
  if (streakDays >= 30) streak = STREAK_BONUS.VETERAN;
  else if (streakDays >= 14) streak = STREAK_BONUS.MONTH;
  else if (streakDays >= 7) streak = STREAK_BONUS.BIWEEK;
  else if (streakDays >= 3) streak = STREAK_BONUS.WEEK;

  return Math.round(baseScore * decay * diversity * streak);
}

function getTierFromScore(score) {
  if (score >= 5000) return "Legend";
  if (score >= 2500) return "Diamond";
  if (score >= 1000) return "Gold";
  if (score >= 300) return "Silver";
  return "Bronze";
}

// =====================================================================
//  0. AUTHENTICATION — Sign In With Wallet
// =====================================================================

/**
 * signInWithWallet
 *
 * Verifies a Solana wallet signature and issues a Firebase Custom Auth token.
 * This ensures all subsequent Firestore calls include a verified auth.uid = walletAddress.
 *
 * Flow:
 *   1. Client signs a message via MWA signMessage()
 *   2. Client sends { walletAddress, message, signature (base64) } to this function
 *   3. Server verifies the ed25519 signature using tweetnacl
 *   4. Server creates a Firebase Custom Auth token via admin.auth().createCustomToken()
 *   5. Client calls auth().signInWithCustomToken(token) to authenticate
 *
 * Parameters (in data):
 *   - walletAddress: string (base58 Solana public key)
 *   - message: string (the plaintext message that was signed)
 *   - signature: string (base64-encoded 64-byte ed25519 signature)
 */
exports.signInWithWallet = onCall(async (request) => {
  const { walletAddress, message, signature } = request.data;

  if (!walletAddress || !message || !signature) {
    throw new HttpsError("invalid-argument", "walletAddress, message, and signature are required.");
  }

  // Validate wallet address format (base58, 32-44 chars)
  if (walletAddress.length < 32 || walletAddress.length > 44) {
    throw new HttpsError("invalid-argument", "Invalid wallet address format.");
  }

  // Verify the message contains our app domain (prevents replay attacks with foreign signatures)
  if (!message.includes("DEEP PULSE")) {
    throw new HttpsError("invalid-argument", "Message must contain app identifier.");
  }

  try {
    // Decode wallet address from base58 to bytes (32 bytes public key)
    const publicKeyBytes = bs58.decode(walletAddress);
    if (publicKeyBytes.length !== 32) {
      throw new HttpsError("invalid-argument", "Invalid public key length.");
    }

    // Decode signature from base64 to bytes (64 bytes ed25519 signature)
    const signatureBytes = Buffer.from(signature, "base64");
    if (signatureBytes.length !== 64) {
      throw new HttpsError("invalid-argument", "Invalid signature length.");
    }

    // Convert message to bytes
    const messageBytes = Buffer.from(message, "utf-8");

    // Verify the ed25519 signature
    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKeyBytes,
    );

    if (!isValid) {
      throw new HttpsError("unauthenticated", "Invalid signature. Wallet verification failed.");
    }

    // Signature is valid — create Firebase Custom Auth token
    // The UID is the wallet address (unique per user)
    const customToken = await admin.auth().createCustomToken(walletAddress, {
      walletAddress,
      isAdmin: isAdmin(walletAddress),
    });

    logger.info(`Wallet authenticated: ${walletAddress} (admin: ${isAdmin(walletAddress)})`);

    return {
      success: true,
      token: customToken,
      walletAddress,
    };
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error("signInWithWallet error:", error);
    throw new HttpsError("internal", "Authentication failed: " + error.message);
  }
});

// =====================================================================
//  1. NOTIFICATION FUNCTIONS
// =====================================================================

/**
 * onNewNotification
 *
 * Firestore trigger: when a hub creates a document in
 * `notifications/{notificationId}`, send an FCM push to all
 * devices subscribed to that hub's topic.
 *
 * Expected document fields:
 *   - hubId: string
 *   - title: string
 *   - body: string
 *   - data: object (optional extra payload)
 *   - createdAt: timestamp
 */
exports.onNewNotification = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      logger.warn("onNewNotification: no data in event");
      return;
    }

    const notification = snap.data();
    const { hubId, title, body, data: extraData } = notification;

    if (!hubId || !title) {
      logger.warn("onNewNotification: missing hubId or title", notification);
      return;
    }

    // FCM topic name matches the client subscription pattern
    const topic = `hub_${hubId}`;

    const message = {
      topic,
      notification: {
        title,
        body: body || "",
      },
      data: {
        hubId,
        notificationId: event.params.notificationId,
        ...(extraData || {}),
      },
      android: {
        priority: "high",
        notification: {
          channelId: "deep-pulse-notifications",
          sound: "default",
        },
      },
    };

    try {
      const response = await messaging.send(message);
      logger.info(`FCM sent to topic ${topic}:`, response);

      // Update the notification doc with delivery status
      await snap.ref.update({
        delivered: true,
        fcmResponse: response,
        deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      logger.error(`FCM send failed for topic ${topic}:`, error);
      await snap.ref.update({ delivered: false, fcmError: error.message });
    }
  },
);

/**
 * sendPushToSubscribers
 *
 * Callable function: hubs can trigger push notifications on demand.
 *
 * Parameters (in data):
 *   - hubId: string (required)
 *   - title: string (required)
 *   - body: string (required)
 *   - data: object (optional)
 *
 * This also creates a notification document so onNewNotification fires.
 */
exports.sendPushToSubscribers = onCall(async (request) => {
  const { hubId, title, body, data: extraData } = request.data;

  if (!hubId || !title || !body) {
    throw new HttpsError("invalid-argument", "hubId, title, and body are required.");
  }

  // [C10 FIX] Prefer Firebase Auth UID over client-supplied wallet address
  // When authenticated, request.auth.uid is verified server-side (tamper-proof)
  const callerWallet = request.auth?.uid || request.data.walletAddress;
  if (!callerWallet) {
    throw new HttpsError("unauthenticated", "Authentication or walletAddress is required to send notifications.");
  }

  const hubDoc = await db.collection("hubs").doc(hubId).get();
  if (!hubDoc.exists) {
    throw new HttpsError("not-found", "Hub not found.");
  }

  const hub = hubDoc.data();
  if (hub.creator !== callerWallet && hub.ownerWallet !== callerWallet && !isAdmin(callerWallet)) {
    throw new HttpsError("permission-denied", "Only the hub owner or admin can send notifications.");
  }

  // Create notification document (triggers onNewNotification)
  const notificationRef = await db.collection("notifications").add({
    hubId,
    title,
    body,
    data: extraData || {},
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    source: "callable",
  });

  logger.info(`Notification created for hub ${hubId}: ${notificationRef.id}`);

  return {
    success: true,
    notificationId: notificationRef.id,
    message: `Push notification queued for hub_${hubId} subscribers.`,
  };
});

// =====================================================================
//  2. AD SLOT FUNCTIONS
// =====================================================================

/**
 * onAdCreativeUploaded
 *
 * Storage trigger: when an image is uploaded to `ad-creatives/`,
 * create a Firestore document in `adCreatives` for admin review.
 *
 * Storage path convention: ad-creatives/{walletAddress}/{filename}
 * The filename encodes: {timestamp}_{slotType}.{ext}
 */
exports.onAdCreativeUploaded = onObjectFinalized(
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Only process files in ad-creatives/
    if (!filePath || !filePath.startsWith("ad-creatives/")) {
      return;
    }

    // Reject non-image uploads
    if (!contentType || !contentType.startsWith("image/")) {
      logger.warn(`Non-image uploaded to ad-creatives: ${contentType}`);
      return;
    }

    // Parse path: ad-creatives/{walletAddress}/{timestamp}_{slotType}.{ext}
    const parts = filePath.split("/");
    if (parts.length < 3) {
      logger.warn(`Unexpected path format: ${filePath}`);
      return;
    }

    const walletAddress = parts[1];
    const fileName = parts[2];

    // Extract slotType from filename (e.g. "1708123456789_lockscreen.png")
    let slotType = "unknown";
    const nameMatch = fileName.match(/_(\w+)\.\w+$/);
    if (nameMatch) {
      slotType = nameMatch[1]; // "top", "bottom", or "lockscreen"
    }

    // Build download URL
    const bucket = admin.storage().bucket(event.data.bucket);
    const file = bucket.file(filePath);

    let downloadUrl;
    try {
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: "01-01-2030",
      });
      downloadUrl = signedUrl;
    } catch (err) {
      // Fallback: construct public URL (requires public access or client getDownloadURL)
      downloadUrl = "https://firebasestorage.googleapis.com/v0/b/" +
        `${event.data.bucket}/o/${encodeURIComponent(filePath)}?alt=media`;
      logger.warn("Signed URL failed, using public URL fallback:", err.message);
    }

    // Create Firestore document for admin review
    const creativeDoc = {
      walletAddress,
      slotType,
      fileName,
      filePath,
      downloadUrl,
      contentType,
      fileSize: parseInt(event.data.size, 10) || 0,
      status: "pending_review", // pending_review | approved | rejected
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedAt: null,
      reviewedBy: null,
      rejectionReason: null,
      metadata: event.data.metadata || {},
    };

    const ref = await db.collection("adCreatives").add(creativeDoc);
    logger.info(`Ad creative queued for review: ${ref.id} (${slotType}) by ${walletAddress}`);
  },
);

/**
 * moderateAdCreative
 *
 * Callable function: admin approves or rejects a creative.
 *
 * Parameters (in data):
 *   - creativeId: string (Firestore doc ID in adCreatives collection)
 *   - action: "approve" | "reject"
 *   - rejectionReason: string (required if action is "reject")
 *   - walletAddress: string (admin wallet for auth check)
 */
exports.moderateAdCreative = onCall(async (request) => {
  const { creativeId, action, rejectionReason } = request.data;
  // [C10 FIX] Prefer Firebase Auth UID over client-supplied wallet
  const walletAddress = request.auth?.uid || request.data.walletAddress;

  if (!creativeId || !action) {
    throw new HttpsError("invalid-argument", "creativeId and action are required.");
  }

  if (!["approve", "reject"].includes(action)) {
    throw new HttpsError("invalid-argument", "action must be 'approve' or 'reject'.");
  }

  // Admin check
  if (!walletAddress || !isAdmin(walletAddress)) {
    throw new HttpsError("permission-denied", "Only admins can moderate ad creatives.");
  }

  const creativeRef = db.collection("adCreatives").doc(creativeId);
  const creativeDoc = await creativeRef.get();

  if (!creativeDoc.exists) {
    throw new HttpsError("not-found", "Creative not found.");
  }

  const creative = creativeDoc.data();
  if (creative.status !== "pending_review") {
    throw new HttpsError("failed-precondition", `Creative already ${creative.status}.`);
  }

  if (action === "approve") {
    await creativeRef.update({
      status: "approved",
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: walletAddress,
    });

    // Add to active ads collection for the slot rotation
    await db.collection("activeAds").add({
      creativeId,
      walletAddress: creative.walletAddress,
      slotType: creative.slotType,
      downloadUrl: creative.downloadUrl,
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
      active: true,
    });

    logger.info(`Creative ${creativeId} approved by ${walletAddress}`);
    return { success: true, status: "approved" };
  } else {
    // Reject
    if (!rejectionReason) {
      throw new HttpsError("invalid-argument", "rejectionReason is required for rejection.");
    }

    await creativeRef.update({
      status: "rejected",
      rejectionReason,
      reviewedAt: admin.firestore.FieldValue.serverTimestamp(),
      reviewedBy: walletAddress,
    });

    logger.info(`Creative ${creativeId} rejected by ${walletAddress}: ${rejectionReason}`);
    return { success: true, status: "rejected", reason: rejectionReason };
  }
});

// =====================================================================
//  3. ANALYTICS FUNCTIONS
// =====================================================================

/**
 * trackEvent
 *
 * HTTPS callable: log user events to Firestore analytics collection.
 * Events are stored per-user and aggregated for the dashboard.
 *
 * Parameters (in data):
 *   - walletAddress: string (required)
 *   - eventType: string (required — one of SCORING_COEFFICIENTS keys)
 *   - hubId: string (optional — relevant hub)
 *   - metadata: object (optional)
 */
exports.trackEvent = onCall(async (request) => {
  // [C10 FIX] Prefer Firebase Auth UID over client-supplied wallet
  const walletAddress = request.auth?.uid || request.data.walletAddress;
  const { eventType, hubId, metadata } = request.data;

  if (!walletAddress || !eventType) {
    throw new HttpsError("invalid-argument", "walletAddress and eventType are required.");
  }

  // Validate event type
  const validEvents = Object.keys(SCORING_COEFFICIENTS);
  if (!validEvents.includes(eventType)) {
    throw new HttpsError("invalid-argument", `Invalid eventType. Must be one of: ${validEvents.join(", ")}`);
  }

  const now = new Date();
  const dateKey = now.toISOString().split("T")[0]; // "YYYY-MM-DD"

  // Check daily caps for capped event types
  const cappedTypes = {
    SWIPE_SKIP: "SWIPE_POINTS",
    SWIPE_ENGAGE: "SWIPE_POINTS",
    READ_NOTIFICATION: "READ_NOTIFICATION",
    CLICK_AD: "CLICK_AD",
    SUBSCRIBE_HUB: "SUBSCRIBE_HUB",
  };

  if (cappedTypes[eventType]) {
    const capKey = cappedTypes[eventType];
    const capLimit = DAILY_CAPS[capKey];

    // Check today's count for this user + event category
    const dailyRef = db
      .collection("analytics")
      .doc(walletAddress)
      .collection("dailyCaps")
      .doc(dateKey);

    const dailyDoc = await dailyRef.get();
    const dailyData = dailyDoc.exists ? dailyDoc.data() : {};
    const currentPoints = dailyData[capKey] || 0;

    if (currentPoints >= capLimit) {
      return {
        success: true,
        capped: true,
        message: `Daily cap reached for ${capKey} (${capLimit} pts).`,
      };
    }

    // Update daily cap counter
    const pointsEarned = SCORING_COEFFICIENTS[eventType];
    await dailyRef.set(
      { [capKey]: admin.firestore.FieldValue.increment(pointsEarned) },
      { merge: true },
    );
  }

  // Write the event to the user's events subcollection
  await db
    .collection("analytics")
    .doc(walletAddress)
    .collection("events")
    .add({
      eventType,
      hubId: hubId || null,
      metadata: metadata || {},
      points: SCORING_COEFFICIENTS[eventType],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      date: dateKey,
    });

  // Increment the user's action counter
  await db
    .collection("analytics")
    .doc(walletAddress)
    .set(
      {
        [`actions.${eventType}`]: admin.firestore.FieldValue.increment(1),
        lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  // Increment global counters
  await db
    .collection("globalStats")
    .doc("counters")
    .set(
      {
        [`totalEvents.${eventType}`]: admin.firestore.FieldValue.increment(1),
        totalEventsAll: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

  logger.info(`Event tracked: ${eventType} by ${walletAddress}`);

  return {
    success: true,
    capped: false,
    points: SCORING_COEFFICIENTS[eventType],
  };
});

/**
 * getAnalyticsDashboard
 *
 * HTTPS callable: return aggregated stats for the admin dashboard.
 *
 * Returns:
 *   - totalUsers: number
 *   - totalSwipes: number
 *   - totalRevenue: number (estimated from deposits)
 *   - activeHubs: number
 *   - topEvents: object with event type counts
 *   - recentActivity: last 24h event count
 */
exports.getAnalyticsDashboard = onCall(async (request) => {
  const walletAddress = request.auth?.uid || request.data?.walletAddress; // [B41-C10] Prefer verified auth

  // Admin check (optional: allow any user to see limited stats)
  const adminOnly = walletAddress && isAdmin(walletAddress);

  // Fetch global counters
  const countersDoc = await db.collection("globalStats").doc("counters").get();
  const counters = countersDoc.exists ? countersDoc.data() : {};

  // Count total users (analytics documents = unique users)
  const usersSnapshot = await db.collection("analytics").count().get();
  const totalUsers = usersSnapshot.data().count;

  // Count active hubs
  const hubsSnapshot = await db.collection("hubs").where("active", "==", true).count().get();
  const activeHubs = hubsSnapshot.data().count;

  // Calculate total swipes
  const totalEvents = counters.totalEvents || {};
  const totalSwipes = (totalEvents.SWIPE_SKIP || 0) + (totalEvents.SWIPE_ENGAGE || 0);

  // Estimate revenue (from on-chain deposit events)
  // Each SEND_FEEDBACK = 300 SKR, DAO_BOOST = 100 SKR, TALENT_SUBMIT = 50 SKR
  const estimatedRevenue =
    (totalEvents.SEND_FEEDBACK || 0) * 300 +
    (totalEvents.DAO_BOOST || 0) * 100 +
    (totalEvents.TALENT_SUBMIT || 0) * 50;

  // Recent activity (last 24 hours) — admin only
  let recentActivity = 0;
  if (adminOnly) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    // Use collectionGroup to count recent events across all users
    const recentSnapshot = await db
      .collectionGroup("events")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(oneDayAgo))
      .count()
      .get();
    recentActivity = recentSnapshot.data().count;
  }

  const dashboard = {
    totalUsers,
    totalSwipes,
    estimatedRevenueSKR: estimatedRevenue,
    activeHubs,
    totalEventsAll: counters.totalEventsAll || 0,
    topEvents: totalEvents,
    ...(adminOnly ? { recentActivity24h: recentActivity } : {}),
  };

  logger.info("Dashboard fetched", { admin: adminOnly });
  return dashboard;
});

// =====================================================================
//  4. MODERATION FUNCTIONS
// =====================================================================

/**
 * reportContent
 *
 * Callable: users report a notification or hub.
 *
 * Parameters (in data):
 *   - walletAddress: string (reporter)
 *   - contentType: "notification" | "hub"
 *   - contentId: string (notification or hub ID)
 *   - reason: string
 */
exports.reportContent = onCall(async (request) => {
  // [C10 FIX] Prefer Firebase Auth UID over client-supplied wallet
  const walletAddress = request.auth?.uid || request.data.walletAddress;
  const { contentType, contentId, reason } = request.data;

  if (!walletAddress || !contentType || !contentId || !reason) {
    throw new HttpsError(
      "invalid-argument",
      "walletAddress, contentType, contentId, and reason are required.",
    );
  }

  if (!["notification", "hub"].includes(contentType)) {
    throw new HttpsError("invalid-argument", "contentType must be 'notification' or 'hub'.");
  }

  // Check for duplicate reports from the same user
  const existingReport = await db
    .collection("reports")
    .where("reporterWallet", "==", walletAddress)
    .where("contentId", "==", contentId)
    .limit(1)
    .get();

  if (!existingReport.empty) {
    return { success: true, duplicate: true, message: "You have already reported this content." };
  }

  // Create the report
  const reportRef = await db.collection("reports").add({
    reporterWallet: walletAddress,
    contentType,
    contentId,
    reason,
    status: "pending", // pending | reviewed | resolved | dismissed
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
  });

  // Count total reports for this content
  const reportCountSnap = await db
    .collection("reports")
    .where("contentId", "==", contentId)
    .count()
    .get();
  const reportCount = reportCountSnap.data().count;

  // Auto-flag if content reaches 5+ reports
  if (reportCount >= 5) {
    const collection = contentType === "hub" ? "hubs" : "notifications";
    await db.collection(collection).doc(contentId).update({
      flagged: true,
      flagReason: `Auto-flagged: ${reportCount} user reports`,
      flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    logger.warn(`Content auto-flagged: ${contentType}/${contentId} (${reportCount} reports)`);
  }

  logger.info(`Report created: ${reportRef.id} for ${contentType}/${contentId}`);

  return {
    success: true,
    reportId: reportRef.id,
    message: "Report submitted. Our team will review it.",
  };
});

/**
 * autoModerate
 *
 * Firestore trigger: when a new notification is created, check its
 * title and body for bad words. If found, flag it automatically.
 *
 * Listens on: notifications/{notificationId}
 */
exports.autoModerate = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const snap = event.data;
    if (!snap) return;

    const notification = snap.data();
    const { title, body, hubId } = notification;

    const titleFlagged = containsBadWords(title);
    const bodyFlagged = containsBadWords(body);

    if (titleFlagged || bodyFlagged) {
      const flaggedWords = BAD_WORDS.filter((word) => {
        const combined = `${title || ""} ${body || ""}`.toLowerCase();
        return combined.includes(word);
      });

      await snap.ref.update({
        flagged: true,
        flagReason: `Auto-moderation: contains [${flaggedWords.join(", ")}]`,
        flaggedAt: admin.firestore.FieldValue.serverTimestamp(),
        autoModerated: true,
      });

      // Create a moderation log entry
      await db.collection("moderationLog").add({
        contentType: "notification",
        contentId: event.params.notificationId,
        hubId: hubId || null,
        flaggedWords,
        action: "auto_flagged",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.warn(
        `Auto-moderated notification ${event.params.notificationId}: [${flaggedWords.join(", ")}]`,
      );
    }
  },
);

// =====================================================================
//  5. SCHEDULED FUNCTIONS
// =====================================================================

/**
 * dailyScoreUpdate
 *
 * Runs daily at midnight UTC.
 * Recalculates every user's DEEP Score with time decay, streak bonus,
 * diversity multiplier, and diminishing returns.
 *
 * Reads from: analytics/{walletAddress}
 * Writes to:  users/{walletAddress} (score, tier, rank)
 */
exports.dailyScoreUpdate = onSchedule(
  {
    schedule: "every day 00:00",
    timeZone: "UTC",
    retryCount: 3,
  },
  async (_event) => {
    logger.info("Starting daily DEEP Score update...");

    const analyticsSnap = await db.collection("analytics").get();

    if (analyticsSnap.empty) {
      logger.info("No analytics data found. Skipping score update.");
      return;
    }

    const now = new Date();
    const scores = []; // { walletAddress, score, tier }
    let batch = db.batch();
    let processedCount = 0;

    for (const doc of analyticsSnap.docs) {
      const walletAddress = doc.id;
      const data = doc.data();
      const actions = data.actions || {};

      // Calculate days since last activity
      let recentActivityDays = 999;
      if (data.lastActivityAt) {
        const lastActivity = data.lastActivityAt.toDate();
        recentActivityDays = Math.floor((now - lastActivity) / (1000 * 60 * 60 * 24));
      }

      // Count distinct action types
      const actionTypesCount = Object.keys(actions).filter((k) => actions[k] > 0).length;

      // Calculate streak days (consecutive days with on-chain activity)
      let streakDays = 0;
      if (data.streakDays !== undefined) {
        // If we track streak, use it; otherwise default to 0
        streakDays = data.streakDays || 0;
      }

      // Calculate score
      const score = calculateDeepScore(actions, recentActivityDays, actionTypesCount, streakDays);
      const tier = getTierFromScore(score);

      scores.push({ walletAddress, score, tier });

      // Update the user's score document
      const userRef = db.collection("users").doc(walletAddress);
      batch.set(
        userRef,
        {
          deepScore: score,
          tier,
          lastScoreUpdate: admin.firestore.FieldValue.serverTimestamp(),
          recentActivityDays,
          actionTypesCount,
          streakDays,
        },
        { merge: true },
      );

      processedCount++;

      // Firestore batch limit is 500 writes — commit and create a NEW batch
      if (processedCount % 450 === 0) {
        await batch.commit();
        batch = db.batch(); // Create fresh batch (cannot reuse after commit)
        logger.info(`Committed batch at ${processedCount} users`);
      }
    }

    // Commit remaining writes in the current batch
    if (processedCount % 450 !== 0) {
      await batch.commit();
    }

    // Sort scores descending and assign ranks
    scores.sort((a, b) => b.score - a.score);

    // Update top 100 leaderboard document
    const top100 = scores.slice(0, 100).map((entry, index) => ({
      rank: index + 1,
      walletAddress: entry.walletAddress,
      score: entry.score,
      tier: entry.tier,
    }));

    await db.collection("globalStats").doc("leaderboard").set({
      top100,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      totalUsersScored: processedCount,
    });

    logger.info(`Daily score update complete. ${processedCount} users scored. Top score: ${scores[0]?.score || 0}`);
  },
);

/**
 * cleanExpiredBoostVaults
 *
 * Runs daily at 01:00 UTC.
 * Finds DAO boost vaults that have passed their expiration date
 * and marks them as expired. Does NOT handle on-chain settlement
 * (that must be done via the Solana program).
 *
 * Reads from: boostVaults where status == "open" and expiresAt < now
 * Writes to:  boostVaults (status -> "expired")
 */
exports.cleanExpiredBoostVaults = onSchedule(
  {
    schedule: "every day 01:00",
    timeZone: "UTC",
    retryCount: 3,
  },
  async (_event) => {
    logger.info("Starting expired boost vault cleanup...");

    const now = admin.firestore.Timestamp.now();

    const expiredSnap = await db
      .collection("boostVaults")
      .where("status", "==", "open")
      .where("expiresAt", "<=", now)
      .get();

    if (expiredSnap.empty) {
      logger.info("No expired boost vaults found.");
      return;
    }

    let batch = db.batch();
    let count = 0;

    for (const doc of expiredSnap.docs) {
      batch.update(doc.ref, {
        status: "expired",
        expiredAt: admin.firestore.FieldValue.serverTimestamp(),
        needsOnChainSettlement: true,
      });
      count++;

      if (count % 450 === 0) {
        await batch.commit();
        batch = db.batch(); // [B41] New batch after commit — cannot reuse
      }
    }

    if (count % 450 !== 0) {
      await batch.commit();
    }

    // Log summary
    await db.collection("moderationLog").add({
      action: "vault_cleanup",
      vaultsExpired: count,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    logger.info(`Expired ${count} boost vaults.`);
  },
);
