# DEEP PULSE — Web3 Notification Hub for Solana Mobile

[![Solana](https://img.shields.io/badge/Solana-Anchor%200.30-9945FF?logo=solana)](https://www.anchor-lang.com/)
[![React Native](https://img.shields.io/badge/React_Native-0.76.9-61DAFB?logo=react)](https://reactnative.dev)
[![MWA](https://img.shields.io/badge/MWA-2.1.0-success)](https://docs.solanamobile.com)
[![Token](https://img.shields.io/badge/%24SKR-SPL_Token-blue)](https://solscan.io/token/SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3)

**DEEP Pulse** is a decentralized notification platform built on Solana Mobile. Brands create notification hubs, users subscribe for free, and all economic activity (subscriptions, deposits, DAO vaults, ad slots) runs on-chain via a single Anchor program using the **$SKR** token.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Smart Contracts](#smart-contracts)
- [Frontend](#frontend)
- [Backend API](#backend-api-firebase-cloud-functions)
- [Configuration](#configuration)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Economic Model](#economic-model)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [References](#references)
- [License](#license)

---

## Overview

### What DEEP Pulse Does

| Role | Features |
|------|----------|
| **Users** | Free hub subscriptions, push notifications, submit feedback (300 $SKR deposit), vote on DAO proposals (100 $SKR), discover talent, Swipe-to-Earn on lock screen, DEEP Score v2 with streaks & tiers |
| **Brands** | Create notification hubs (2,000 $SKR/month) with lifecycle (creation -> admin approval -> Discover listing), moderate content, manage ad slots, receive DAO boost funding, launch DOOH campaigns |
| **Advertisers** | Purchase top/bottom ad slots with duration-based discounts (up to 40% off), lock screen premium ads (2,000 $SKR/week), Push Notification Ads (500 $SKR/week) via FCM push on all devices — full campaign creation flow with title, body, CTA button, image URL, duration selector, live preview, and volume discounts, DOOH Worldwide campaign briefs |
| **DAO** | Community-funded boost proposals, 95/5 brand/platform split, automatic refunds on cancellation |

### Key Differentiators

- **Fully on-chain** — All business logic enforced by a Solana program
- **Serverless backend** — Firebase Cloud Functions (10 functions) for push notifications, analytics, moderation, ad processing — $0/month on free tier
- **Solana Mobile native** — Built for MWA 2.0, compatible with Solana Seeker SeedVault + Phantom + Solflare
- **Existing token** — Uses the $SKR SPL token (`SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`), no new token creation
- **Escrow-based deposits** — Tokens locked in PDA escrows until brand moderation resolves
- **Permissionless cranks** — Anyone can trigger vault completion or ad slot expiry
- **Swipe-to-Earn** — Lock screen overlay (WebView HTML5) rewards users for engaging with sponsored content (+0.2/+0.5 pts per action, 3 pts/day cap)
- **DEEP Score v2** — Anti-farming scoring with diminishing returns, daily caps, streak bonuses, time decay, and diversity multipliers
- **Push Notification Ads** — Push notification ads delivered via FCM (500 $SKR/week), full campaign creation flow with title, body, CTA button, image URL, duration selector, live preview, and volume discounts — works on all devices including Seeker (no SYSTEM_ALERT_WINDOW needed)
- **DOOH Worldwide** — Digital Out-Of-Home campaign brief form accessible from HubDashboard, enabling global billboard/screen campaigns
- **Hub Lifecycle** — Creating a hub adds it to admin pending queue; admin approves; hub then appears on Discover for users to subscribe
- **Discord integration** — Brands connect their Discord #announcements channel to auto-forward major announcements as push notifications to hub subscribers
- **Solscan integration** — Transaction history links directly to Solscan filtered by wallet address
- **Global notification mute** — Users can mute all push notifications with a single toggle

---

## Architecture

```
+-------------------------------------------------------------------+
|                      DEEP PULSE PLATFORM                           |
+-------------------+---------------------+-------------------------+
|                   |                     |                         |
|  React Native App |  Firebase Backend   |  Anchor Program         |
|  (Solana Mobile)  |  (Cloud Functions)  |  (Solana Blockchain)    |
|                   |                     |                         |
|  19 screens       |  10 serverless      |  23 instructions        |
|  MWA 2.0          |  functions          |  8 account types        |
|  NativeWind UI    |  FCM push delivery  |  19 events              |
|  Zustand store    |  Analytics engine   |  33 error codes         |
|  LockScreen       |  Auto-moderation    |  Security-audited       |
|                   |  Score sync         |                         |
|  programService   |  Firestore DB       |  Admin | Hub | Deposit  |
|  walletAdapter    |  Storage (ads)      |  Vault | Ads | Scoring  |
+-------------------+---------------------+-------------------------+
|            $SKR Token (existing SPL mint on Solana)                |
|            SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3           |
+-------------------------------------------------------------------+
```

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Blockchain** | Solana | mainnet-beta / devnet |
| **Smart Contracts** | Anchor framework | 0.30.1 |
| **Token** | SPL Token ($SKR) | 6 decimals |
| **Mobile** | React Native | 0.76.9 |
| **Wallet** | Mobile Wallet Adapter | 2.1.0 |
| **Expo SDK** | Expo | 52.0.0 |
| **State** | Zustand + persist | 4.5.x |
| **Styling** | NativeWind (Tailwind) | 2.x |
| **Navigation** | React Navigation | 6.x |
| **Push Notifications** | Firebase Cloud Messaging | latest |
| **Backend** | Firebase Cloud Functions (Node.js 20) | v2 (gen2) |
| **Database** | Cloud Firestore | latest |
| **Ad Creative Storage** | Firebase Storage | latest |
| **Image Upload** | react-native-image-picker | 7.x |
| **Admin** | Platform admin panel | Built-in |

---

## Getting Started

### Prerequisites

```bash
# Node.js 20+
node --version

# Rust toolchain
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli

# Android Studio + SDK (for mobile builds)
# Java JDK 17
```

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd deep-pulse-complete

# Install JavaScript dependencies
npm install

# Build the Anchor program
anchor build

# Run tests
anchor test
```

### Quick Android Build

```bash
# Generate android/ directory if missing
./build.sh

# Set Android SDK path (macOS)
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties

# Build debug APK (for testing)
cd android && ./gradlew assembleDebug

# Build release APK (for distribution / Seeker)
cd android && ./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk (~57MB)

# Install on connected device / Solana Seeker
adb install app/build/outputs/apk/release/app-release.apk

# Launch the app
adb shell am start -n com.deeppulse/.MainActivity
```

### Browser Preview (No Device Needed)

```bash
open web-preview/index.html
```

Navigate between Onboarding, Home, and Discover screens directly in your browser.

---

## Project Structure

```
deep-pulse-complete/
|
|-- programs/deep-pulse/               # === SOLANA PROGRAM (Anchor / Rust) ===
|   |-- Cargo.toml                     # Rust deps: anchor-lang 0.30.1, anchor-spl
|   +-- src/
|       |-- lib.rs                     # Program entry point — 23 instructions
|       |-- constants.rs               # PDA seeds, pricing defaults, scoring
|       |-- errors.rs                  # 33 error codes
|       |-- events.rs                  # 19 on-chain events for indexing
|       |-- instructions/
|       |   |-- admin.rs               # initialize_platform, update_config, transfer_admin
|       |   |-- hub.rs                 # create, renew, subscribe, unsubscribe, verify, activate
|       |   |-- deposit.rs             # create, approve_feedback/dao/talent, reject
|       |   |-- dao_vault.rs           # contribute, complete, cancel, expire, claim_refund
|       |   |-- ad_slot.rs             # purchase, update, expire
|       |   +-- scoring.rs             # init_user_score
|       +-- state/
|           |-- platform.rs            # PlatformConfig (singleton)
|           |-- hub.rs                 # Hub, HubSubscription, HubCategory enum
|           |-- deposit.rs             # Deposit, DepositType, DepositStatus
|           |-- dao_vault.rs           # DaoVault, VaultContribution, VaultStatus
|           |-- ad_slot.rs             # AdSlot, SlotType, discount calculator
|           +-- user_score.rs          # UserScore, ActionType
|
|-- tests/
|   +-- deep-pulse.ts                 # === TEST SUITE (TypeScript / Mocha) ===
|
|-- src/                               # === REACT NATIVE APP ===
|   |-- screens/                       # 19 screens
|   |   |-- OnboardingScreen.js        # Wallet connect + onboarding slides
|   |   |-- HomeScreen.js              # Feed + rotating ad banners
|   |   |-- DiscoverScreen.js          # Browse and search hubs
|   |   |-- MyHubsScreen.js            # User's subscribed hubs
|   |   |-- NotificationsScreen.js     # Push notification list
|   |   |-- ProfileScreen.js           # Wallet info, score, tier badge
|   |   |-- HubDashboardScreen.js      # Brand hub management dashboard
|   |   |-- BrandModerationScreen.js   # Approve / reject deposits
|   |   |-- BrandBoostScreen.js        # DAO boost proposal management
|   |   |-- DAOBoostScreen.js          # Community vault funding
|   |   |-- TalentScreen.js            # Talent marketplace
|   |   |-- AdSlotsScreen.js           # Purchase ad slots
|   |   |-- AdminScreen.js             # Platform admin panel
|   |   |-- AdminMessagesScreen.js     # Admin <-> Brand messaging
|   |   |-- HubNotificationsScreen.js  # Hub-specific notification feed
|   |   |-- NotificationDetailScreen.js # Full notification detail view
|   |   |-- SwipeEarnScreen.js          # Swipe-to-Earn dashboard (lock screen ads)
|   |   |-- DOOHScreen.js              # DOOH Worldwide campaign brief form
|   |   +-- PushNotificationAdScreen.js # Push Notification Ads management (campaign creation flow)
|   |-- components/
|   |   |-- WalletButton.js            # MWA connect / disconnect + SIWS
|   |   |-- AdRotation.js              # 15-second rotating banner ads
|   |   |-- AlertCard.js               # Notification cards
|   |   |-- ProjectCard.js             # Hub listing cards
|   |   +-- MockAdBanners.js          # Local React Native ad banners (real mock ads)
|   |-- services/
|   |   |-- programService.js          # Anchor client SDK (PDA helpers + MWA wrappers)
|   |   |-- ModerationService.js       # Brand moderation (on-chain calls)
|   |   |-- walletAdapter.js           # MWA 2.0 (authorize, sign, SIWS, error handling)
|   |   |-- transactionHelper.js       # UI ↔ chain bridge (wallet state, error handling, alerts)
|   |   |-- lockScreenService.js       # Swipe-to-Earn JS bridge (native Android LockScreen module)
|   |   |-- notificationService.js     # Firebase Cloud Messaging (FCM) push notifications
|   |   |-- firebaseService.js         # Firebase backend wiring (Firestore + Cloud Functions + FCM topics)
|   |   +-- storageService.js          # Firebase Storage — ad creative upload (image picker + progress)
|   |-- store/
|   |   +-- appStore.js                # Zustand + AsyncStorage persist
|   |-- config/
|   |   |-- constants.js               # App config, pricing, $SKR mint, scoring
|   |   +-- deep_pulse_idl.json        # Anchor IDL (23 instructions, imported locally)
|   |-- data/
|   |   +-- mockData.js                # Development mock data
|   +-- utils/
|       +-- i18n.js                    # Internationalization
|
|-- android/                            # Android native project
|-- android-config/                     # Pre-configured Android files (MWA ready)
|-- web-preview/                        # Browser preview (no emulator needed)
|-- idl/
|   +-- deep_pulse.json                # Anchor IDL (23 instructions, auto-generated)
|-- scripts/
|   |-- deploy-devnet.sh                # Automated devnet deploy (balance check + airdrop + deploy)
|   |-- init-devnet.ts                  # Platform initialization (custom pricing + test hub)
|   +-- patch-nativewind.js             # NativeWind postinstall fix
|-- functions/                           # === FIREBASE CLOUD FUNCTIONS BACKEND ===
|   |-- index.js                        # 10 serverless functions (939 lines)
|   |-- package.json                    # Node.js 20, firebase-functions v5
|   +-- .eslintrc.js                    # ESLint config
|
|-- Anchor.toml                         # Anchor config (cluster, wallet, scripts)
|-- Cargo.toml                          # Rust workspace
|-- package.json                        # JS dependencies + devnet:deploy/init scripts
|-- app.json                            # Expo / React Native config (SDK 52)
|-- metro.config.js                     # Metro bundler + crypto polyfills
|-- index.js                            # Entry point (polyfills loaded first)
|-- tsconfig.json                       # TypeScript config (tests)
|-- SMART_CONTRACTS.md                  # Detailed smart contract docs (French)
|-- firebase.json                       # Firebase config (Functions + Storage + Firestore)
|-- .firebaserc                         # Firebase project link (deep-pulse)
|-- storage.rules                       # Firebase Storage security rules
|-- firestore.rules                     # Firestore security rules (deployed)
|-- firestore.indexes.json             # Firestore composite indexes
|-- docs/
|   +-- PRIVACY_POLICY.md              # Privacy policy (required for dApp Store)
+-- README.md                           # This file
```

---

## Smart Contracts

> Full technical documentation: [SMART_CONTRACTS.md](./SMART_CONTRACTS.md)

### Program Overview

A single monolithic Anchor program handles all on-chain logic. No CPI between modules — all instructions are atomic.

| Module | Instructions | Description |
|--------|-------------|-------------|
| **Admin** | 3 | Platform initialization, config updates, admin transfer |
| **Hub** | 8 | Hub CRUD, user subscriptions, admin verification, activate/deactivate |
| **Deposit** | 5 | Escrow create, approve (3 types), reject |
| **DAO Vault** | 5 | Contribute, complete, cancel, expire, refund |
| **Ad Slots** | 3 | Purchase, update creative, expire |
| **Scoring** | 1 | Initialize user score account |
| **Total** | **23** | (including renew_hub_subscription) |

### On-Chain Accounts (PDAs)

| Account | PDA Seeds | Size | Approx. Rent |
|---------|-----------|------|--------------|
| `PlatformConfig` | `["platform_config"]` | 165 B | ~0.002 SOL |
| `Hub` | `["hub", creator, index]` | 393 B | ~0.004 SOL |
| `HubSubscription` | `["subscription", user, hub]` | 81 B | ~0.001 SOL |
| `Deposit` | `["deposit", depositor, index]` | 167 B | ~0.002 SOL |
| `DaoVault` | `["vault", hub, index]` | 417 B | ~0.004 SOL |
| `VaultContribution` | `["contribution", vault, contributor]` | 90 B | ~0.002 SOL |
| `AdSlot` | `["ad_slot", hub, type, index]` | 172 B | ~0.002 SOL |
| `UserScore` | `["user_score", user]` | 76 B | ~0.001 SOL |

### Token Flows

**Deposit Escrow Pattern:**
```
User --> create_deposit() --> [Escrow PDA locks $SKR]
                                    |
                        +-----------+-----------+
                        |                       |
                   approve_*()           reject_deposit()
                        |                       |
                 Refund to User         Forfeit to Treasury
```

**DAO Vault Pattern:**
```
Community --> contribute_to_vault() --> [Vault PDA collects $SKR]
                                              |
                                        complete_vault()
                                              |
                              +---------------+---------------+
                              |                               |
                         95% to Brand                   5% to Treasury
```

### Ad Slot Duration Discounts

| Duration | Discount |
|----------|----------|
| 52 weeks (1 year, max) | 40% off |
| 26+ weeks (6 months) | 30% off |
| 12+ weeks (3 months) | 20% off |
| 4+ weeks (1 month) | 10% off |
| < 4 weeks | No discount |

### All 23 Instructions

<details>
<summary><strong>Click to expand full instruction reference</strong></summary>

#### Admin (3)

| # | Instruction | Description | Signer |
|---|-------------|-------------|--------|
| 1 | `initialize_platform` | Create `PlatformConfig` singleton + Treasury PDA. Pass the existing $SKR mint. All pricing params optional (defaults apply). | Admin |
| 2 | `transfer_admin` | Transfer admin role to a new wallet. Both current and new admin must sign. | Current Admin + New Admin |
| 3 | `update_platform_config` | Update any pricing/config field. Validates `brand_bps + platform_bps == 10000`. | Admin |

#### Hub (6)

| # | Instruction | Cost ($SKR) | Signer |
|---|-------------|-------------|--------|
| 3 | `create_hub` | 2,000 (subscription) | Brand |
| 4 | `renew_hub_subscription` | 2,000 (extends +30 days) | Brand |
| 5 | `subscribe_to_hub` | Rent only (~0.001 SOL) | User |
| 6 | `unsubscribe_from_hub` | 0 (rent returned) | User |
| 7 | `set_hub_verified` | 0 | Admin |
| 8 | `set_hub_active` | 0 | Admin |

#### Deposit / Escrow (5)

| # | Instruction | Description | Signer |
|---|-------------|-------------|--------|
| 9 | `create_deposit` | Lock $SKR in escrow PDA. Amount by type: Feedback=300, DaoProposal=100, Talent=50. | User |
| 10 | `approve_feedback` | Refund escrow to depositor. Close escrow account. | Brand (hub creator) |
| 11 | `approve_dao_proposal` | Refund depositor + create `DaoVault` with target, expiry, title. | Brand |
| 12 | `approve_talent` | Refund escrow to depositor. Close escrow account. | Brand |
| 13 | `reject_deposit` | Send escrow tokens to platform treasury. Close escrow. | Brand |

#### DAO Vault (5)

| # | Instruction | Description | Signer |
|---|-------------|-------------|--------|
| 15 | `contribute_to_vault` | Transfer $SKR to vault. Capped at target_amount. Checks min amount, expiry. Updates user score. | User |
| 16 | `complete_vault` | Distribute funds: 95% to brand, 5% to treasury. Permissionless crank. | Anyone |
| 17 | `cancel_vault` | Set vault status to `Cancelled`. Enables refunds. | Brand or Admin |
| 18 | `expire_vault` | Expire a vault past its deadline. Permissionless crank. | Anyone |
| 19 | `claim_vault_refund` | Contributor reclaims their proportional share from cancelled/expired vault. | Contributor |

#### Ad Slots (3)

| # | Instruction | Description | Signer |
|---|-------------|-------------|--------|
| 18 | `purchase_ad_slot` | Buy a top/bottom ad slot. Price = base * weeks * (1 - discount). Payment to treasury. | Advertiser |
| 19 | `update_ad_slot` | Change image/landing URL hashes (creative swap). | Advertiser (owner) |
| 20 | `expire_ad_slot` | Deactivate slot after `end_time`. Permissionless crank. | Anyone |

#### Scoring (1)

| # | Instruction | Description | Signer |
|---|-------------|-------------|--------|
| -- | `init_user_score` | Create `UserScore` PDA for a user. Must be called before scoring hooks work. | User |

**Scoring hooks** are embedded in other instructions (DEEP Score v2):

| Action | Triggered by | Points |
|--------|-------------|--------|
| DAO Boost | `contribute_to_vault` | +50 |
| Hub Creation | `create_hub` | +40 |
| Talent | `create_deposit(Talent)` | +25 |
| Feedback | `create_deposit(Feedback)` | +15 |
| Proposal Vote | `contribute_to_vault` (vote) | +8 |
| Subscribe | `subscribe_to_hub` | +5 |

</details>

---

## Frontend

### Services Layer

| Service | Purpose |
|---------|---------|
| `programService.js` | Anchor client SDK — all PDA derivation helpers, IDL loading (local JSON), MWA `transact()` wrappers for every instruction |
| `transactionHelper.js` | UI ↔ chain bridge — wallet state management, generic `executeTransaction()` wrapper, user-friendly error parsing, all screen-level transaction functions |
| `ModerationService.js` | Brand moderation — wraps `programService` calls for approve/reject flows |
| `walletAdapter.js` | MWA 2.0 — authorize, reauthorize, SIWS (Sign In With Solana), `signAndSendTransactions`, full error handling |
| `lockScreenService.js` | Swipe-to-Earn — JS bridge to native Android LockScreen overlay (start/stop, permissions, ad queue, swipe events) |
| `notificationService.js` | Firebase Cloud Messaging (FCM) — push notification token registration and channel setup |
| `firebaseService.js` | **Firebase backend wiring** — Firestore + Cloud Functions + FCM topics (sendHubNotification, subscribeToHubBackend, createHubInFirestore, approveHubInFirestore, registerFcmToken, trackEvent, etc.) — two-tier fallback: Cloud Function → Firestore direct → local-only |
| `storageService.js` | Firebase Storage — ad creative image upload with validation, progress tracking, and download URL retrieval |

### State Management

Zustand store with `persist` middleware auto-syncs to `AsyncStorage`:

```javascript
// Persisted state (survives app restart):
wallet           // { publicKey, authToken }
subscribedProjects  // [hubPda1, hubPda2, ...]
pushToken        // Expo push notification token
theme            // 'light' | 'dark'
```

### Using the Transaction Helper (Recommended for Screens)

```javascript
import { subscribeToHub, submitFeedback, contributeToVault } from './services/transactionHelper';
import { setWalletState } from './services/transactionHelper';

// Set wallet state after MWA connect
setWalletState(publicKey, authToken);

// Subscribe to a hub (handles wallet check + error alerts)
const result = await subscribeToHub(hubPda);
if (result.success) { /* update UI */ }

// Submit feedback (locks 300 $SKR in escrow)
await submitFeedback(hubPda, "Great notifications!", depositIndex);

// Contribute to a DAO vault
await contributeToVault(vaultPda, 500_000_000);
```

### Using the Program SDK (Low-Level)

```javascript
import { programService } from './services/programService';

// === Read operations (no wallet needed) ===
const hubs     = await programService.fetchAllHubs();
const config   = await programService.fetchPlatformConfig();
const score    = await programService.fetchUserScore(userPubkey);
const vaults   = await programService.fetchOpenVaultsForHub(hubPda);
const ads      = await programService.fetchActiveAdsForHub(hubPda);
const deposits = await programService.fetchPendingDepositsForHub(hubPda);
const subs     = await programService.fetchUserSubscriptions(userPubkey);

// === Write operations (triggers MWA wallet prompt) ===
await programService.initUserScore();
await programService.subscribeToHub(hubPda);
await programService.createDeposit(hubPda, 'feedback', hash, 0);
await programService.contributeToVault(vaultPda, 500_000_000);
await programService.purchaseAdSlot(hubPda, 'top', 0, imgHash, urlHash, 12);
await programService.approveFeedback(depositPda, hubPda, depositorPubkey);
await programService.rejectDeposit(depositPda, hubPda, depositorPubkey);
```

### MWA Wallet Integration

```javascript
import { walletAdapter } from './services/walletAdapter';

// Connect wallet (opens Phantom / Solflare)
const { publicKey } = await walletAdapter.connect();

// Sign In With Solana (SIWS)
const siws = await walletAdapter.signInWithSolana();

// Auto-reconnect on app restart
const session = await walletAdapter.autoConnect();

// Disconnect
await walletAdapter.disconnect(authToken);
```

---

## Backend API (Firebase Cloud Functions)

The backend runs entirely on **Firebase Cloud Functions v2** (Node.js 20) — **$0/month** on the free tier. No traditional server required.

### 10 Serverless Functions

| Function | Trigger | Description |
|----------|---------|-------------|
| `onNewNotification` | Firestore `onCreate` | Formats and stores new notifications, sends FCM push to topic subscribers |
| `sendPushToSubscribers` | HTTPS (callable) | Sends targeted push notifications to all subscribers of a specific hub |
| `onAdCreativeUploaded` | Storage `onObjectFinalized` | Validates uploaded ad images (size ≤5MB, type JPEG/PNG/WebP), generates Firestore metadata |
| `moderateAdCreative` | HTTPS (callable) | Admin-only: approve or reject ad creatives, deactivates rejected images |
| `trackEvent` | HTTPS (callable) | Records analytics events (ad_click, notification_read, swipe_earn, hub_subscribe, etc.) |
| `getAnalyticsDashboard` | HTTPS (callable) | Returns aggregated analytics for a hub (24h/7d/30d periods, top events, engagement rate) |
| `reportContent` | HTTPS (callable) | User content reports (spam, inappropriate, scam) with auto-moderation on 3+ reports |
| `autoModerate` | HTTPS (callable) | Admin bulk moderation — auto-flags content exceeding report thresholds |
| `dailyScoreUpdate` | Scheduled (daily 2AM UTC) | Syncs on-chain DEEP Scores to Firestore, applies time decay + streak multipliers |
| `cleanExpiredBoostVaults` | Scheduled (daily 3AM UTC) | Marks expired DAO boost vaults, updates Firestore status |

### Firestore Collections

| Collection | Purpose | Client Write |
|------------|---------|:------------:|
| `notifications` | Push notification history (triggers FCM via onNewNotification) | ✅ create |
| `hubs` | Hub data (status: PENDING/ACTIVE/REJECTED, subscribers, creator) | ✅ create + update |
| `subscriptions` | User-hub subscriptions ({walletAddress}_{hubId}) + FCM topic sync | ✅ create + delete |
| `fcmTokens` | FCM device tokens per wallet (targeted push delivery) | ✅ write |
| `adCreatives` | Ad image metadata and moderation status | ❌ server-only |
| `analytics` | User events + DEEP Score data (via trackEvent Cloud Function) | ❌ server-only |
| `reports` | User content reports | ❌ server-only |
| `moderationLog` | Admin moderation audit trail | ❌ server-only |
| `boostVaults` | DAO vault status mirror | ❌ server-only |
| `users` | User profiles / DEEP Score (via dailyScoreUpdate) | ❌ server-only |
| `globalStats` | Aggregated platform statistics | ❌ server-only |
| `activeAds` | Ad rotation pool | ❌ server-only |

### Deploy Backend

```bash
cd functions && npm install
firebase deploy --only functions,firestore:rules
firebase deploy --only hosting
```

> **Status:** All 10 Cloud Functions deployed to `us-central1`. Firestore Security Rules deployed with client write access for `notifications`, `hubs`, `subscriptions`, `fcmTokens`.

### Live URLs

| Service | URL |
|---------|-----|
| **Landing Page** | [https://deep-pulse.web.app](https://deep-pulse.web.app) |
| **Cloud Functions** | `https://us-central1-deep-pulse.cloudfunctions.net` |
| **MWA Verification** | `https://deep-pulse.web.app/.well-known/solana/dapp-address` |
| **GitHub** | [github.com/DEEPBRANDINGDOOH/DEEP-PULSE](https://github.com/DEEPBRANDINGDOOH/DEEP-PULSE) |

---

## Configuration

### Key Constants

| Constant | Value | Where to change |
|----------|-------|-----------------|
| **Program ID** | `33vWX6efKQSZ98dk3bnbHUjEYhB7LyvbH4ndpKjC6iY4` | `lib.rs`, `Anchor.toml`, `constants.js`, `programService.js` |
| **$SKR Mint** | `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` | `constants.rs`, `constants.js`, `programService.js` |
| Hub Subscription | 2,000 $SKR/month | `constants.rs`, `constants.js` |
| Feedback Deposit | 300 $SKR | `constants.rs`, `constants.js` |
| DAO Proposal Deposit | 100 $SKR | `constants.rs`, `constants.js` |
| Talent Deposit | 50 $SKR | `constants.rs`, `constants.js` |
| Top Ad Price | 1,500 $SKR/week | `constants.rs`, `constants.js` |
| Bottom Ad Price | 800 $SKR/week | `constants.rs`, `constants.js` |
| Lock Screen Ad | 2,000 $SKR/week | `constants.js` |
| Global Notification | 1,000 $SKR | `constants.js` |
| Push Notification Ad | 500 $SKR/week | `constants.js` |
| DAO Brand Share | 95% (9500 bps) | `constants.rs` |
| DAO Platform Share | 5% (500 bps) | `constants.rs` |
| Min Vault Contribution | 10 $SKR | `constants.rs` |
| **Admin Wallet** | `89Ez94...nXVZc` | `constants.js` |

### Environment

| Setting | Development | Production |
|---------|-------------|------------|
| RPC Endpoint | `https://api.devnet.solana.com` | `https://api.mainnet-beta.solana.com` |
| MWA Cluster | `solana:devnet` | `solana:mainnet-beta` |
| API Backend | `http://localhost:3000/api` | `https://us-central1-deep-pulse.cloudfunctions.net` |
| App Identity | — | `https://deep-pulse.web.app` |
| Mock Data | Enabled (`__DEV__`) | Disabled |

---

## Testing

### Anchor Program Tests

```bash
# Full test suite with local validator
anchor test

# Against devnet (skip local validator)
anchor test --provider.cluster devnet --skip-local-validator
```

### Test Coverage

| Group | What's Tested |
|-------|---------------|
| **Admin** | Initialize platform with defaults, update config, reject unauthorized access |
| **Hub** | Create hub (deducts 2000 $SKR), subscribe, unsubscribe, set verified, renew subscription |
| **Deposit** | Create feedback deposit (locks 300 $SKR), approve (refund), reject (treasury forfeit) |
| **DAO Vault** | Approve proposal (creates vault), contribute, cancel, claim refund |
| **Ad Slots** | Purchase with discount calculation (4 weeks = 10% off), update creative |
| **Scoring** | Init score account, verify point accumulation on subscribe |

### Test Setup (Automatic)

The test suite handles all setup:

1. Airdrops 10 SOL to 5 test wallets (admin, brand, user1, user2, advertiser)
2. Creates a test $SKR mint (simulates the existing token for local testing)
3. Creates token accounts and mints 100,000 $SKR to each wallet
4. Derives all necessary PDAs

### Mobile Testing Checklist

```bash
# Build and install
cd android && ./gradlew assembleDebug
adb install app/build/outputs/apk/debug/app-debug.apk
```

- [ ] App launches without crash
- [ ] Onboarding displays (4 slides)
- [ ] Wallet connect opens Phantom/Solflare
- [ ] Authorization succeeds, PublicKey displays
- [ ] Auto-reconnect works on restart
- [ ] Hub discovery and subscription works
- [ ] Ad rotation (15s interval) works
- [ ] All navigation tabs functional
- [ ] No console errors

---

## Deployment

### Step 1 — Build

```bash
anchor build
```

### Step 2 — Deploy to Devnet (Automated)

```bash
# One-command deploy (handles balance check + airdrop + deploy)
npm run devnet:deploy
# OR
./scripts/deploy-devnet.sh
```

Or manually:
```bash
solana config set --url devnet
solana airdrop 5                          # ~5 SOL needed for deployment
solana program deploy target/deploy/deep_pulse.so \
  --program-id target/deploy/deep_pulse-keypair.json
```

> **Note:** Program ID is already set to `33vWX6efKQSZ98dk3bnbHUjEYhB7LyvbH4ndpKjC6iY4` across all files.

### Step 3 — Initialize Platform (After Deploy)

```bash
# Initialize PlatformConfig with DEEP Pulse custom pricing
npm run devnet:init

# Or deploy + init in one command
npm run devnet:deploy-and-init
```

The init script (`scripts/init-devnet.ts`) does:
1. Calls `initialize_platform` with custom pricing (Feedback=300, Top Ad=1500, Bottom Ad=800)
2. Verifies PlatformConfig on-chain
3. Initializes admin user score
4. Creates a test hub "Solana Gaming" (if admin has $SKR tokens)
5. Prints a full devnet status summary

> **Pricing:** Smart contract defaults and frontend constants are aligned:
> Feedback deposit: **300** $SKR | Top ad/week: **1,500** $SKR | Bottom ad/week: **800** $SKR

### Step 4 — Deploy to Local Validator (for testing)

```bash
solana-test-validator --reset
solana config set --url localhost
solana airdrop 10
solana program deploy target/deploy/deep_pulse.so \
  --program-id target/deploy/deep_pulse-keypair.json
```

### Step 5 — Build Mobile App

```bash
npm install
cd android && ./gradlew assembleRelease
# APK: android/app/build/outputs/apk/release/app-release.apk
```

---

## Security

Built following [solana-foundation/solana-dev-skill](https://github.com/solana-foundation/solana-dev-skill) best practices:

| Category | Implementation |
|----------|----------------|
| **Account type safety** | `Account<'info, T>` for all data accounts, `UncheckedAccount` only for PDA authorities with verified seeds |
| **Authorization** | `has_one = creator` constraints on all owner-restricted actions |
| **Signer validation** | `Signer<'info>` required on every state-mutating instruction |
| **PDA isolation** | Seeds always include a user-specific identifier (no collisions) |
| **Checked arithmetic** | `checked_mul`, `checked_div`, `checked_sub` for all math (no overflows) |
| **Explicit init** | No `init_if_needed` except `VaultContribution` (guarded with contributor validation) |
| **Account closure** | `close = destination` returns rent to the correct party |
| **Discriminators** | Anchor 8-byte discriminators prevent account confusion |
| **Config validation** | `brand_bps + platform_bps == 10000` enforced at init and update |
| **Mint validation** | Every token account checks `mint == platform_config.skr_mint` (hardcoded in `constants.rs`) |
| **Hardcoded $SKR mint** | `SKR_MINT` pubkey hardcoded on-chain — prevents mint substitution attacks |
| **Distinct PDA authorities** | Escrow and vault use separate authority seeds (`escrow_auth`, `vault_authority`) — prevents PDA collisions |
| **Anti-farming scoring** | Score only awarded on approval/first contribution — no score on deposit creation |
| **MWA compliance** | `onWalletNotFound` handler + `authorize` in every `transact()` session |
| **SeedVault compatible** | Works with Solana Seeker SeedVault wallet (MWA 2.0 compliant) |
| **Polyfills** | `react-native-get-random-values` + `buffer` loaded before `@solana/web3.js` |

### Security Audit Results

A comprehensive security audit was performed on all smart contract code. **18 issues found, all fixed:**

| Severity | Count | Key Fixes |
|----------|-------|-----------|
| **Critical** | 3 | C-01: Vault signer seeds mismatch (funds would be permanently locked) — Fixed `VAULT_TOKEN_SEED` → `VAULT_AUTHORITY_SEED`; C-02: Escrow PDA collision (authority = token account) — Added `ESCROW_AUTHORITY_SEED`; C-03: `init_if_needed` reinit guard on `VaultContribution` |
| **High** | 4 | H-01: Hardcoded $SKR mint validation; H-02: Hub validation in `expire_ad_slot`; H-03: Score farming prevention (no points on deposit creation); H-04: Mint validation on all token accounts |
| **Medium** | 6 | Zero minimum contribution, vault duration bounds, shared description buffers, admin transfer event, pause mechanism placeholder, ad slot slot_index limit |
| **Low** | 5 | `checked_sub` for subscriber count, close escrow on approval, contribution tracking improvements |

All critical and high severity issues have been fixed in the deployed smart contract code. See commit `3bd24fd` for the full diff.

---

## Economic Model

### Revenue Sources

| Source | Amount | When |
|--------|--------|------|
| Hub creation | 2,000 $SKR | Brand creates a hub |
| Hub renewal | 2,000 $SKR/month | Brand renews subscription |
| Rejected feedback | 300 $SKR | Brand rejects feedback deposit |
| Rejected proposal | 100 $SKR | Brand rejects DAO proposal |
| Rejected talent | 50 $SKR | Brand rejects talent submission |
| DAO vault fee | 5% of total raised | Vault reaches funding target |
| Ad slot purchase | Variable (with discounts) | Advertiser buys a slot |
| Lock screen ad | 2,000 $SKR/week | Advertiser targets lock screen users |
| Push Notification Ad | 500 $SKR/week | Push notification ad via FCM to all devices — full campaign creation flow with title, body, CTA button, image URL, duration selector, live preview, and volume discounts |

### Deposit Economics

| Action | User Deposits | On Approve | On Reject |
|--------|---------------|------------|-----------|
| Feedback | 300 $SKR | Full refund to user | Sent to treasury |
| DAO Proposal | 100 $SKR | Full refund + vault created | Sent to treasury |
| Talent | 50 $SKR | Full refund to user | Sent to treasury |

### DEEP Score v2 — Anti-Farming Scoring

The scoring system uses **diminishing returns**, **daily caps**, **streak bonuses**, and **time decay** to reward real contributors and prevent farming.

#### Scoring Coefficients

| Action | Points | Type | Daily Cap |
|--------|--------|------|-----------|
| DAO Boost contribution | +50 | On-chain (high value) | — |
| Hub Creation | +40 | On-chain (high value) | — |
| Talent submission | +25 | On-chain (medium value) | — |
| Send Feedback | +15 | On-chain (medium value) | — |
| Proposal Vote | +8 | On-chain (medium value) | — |
| Subscribe to Hub | +5 | On-chain (low value) | 15 pts/day |
| Read Notification | +0.5 | Off-chain (passive) | 5 pts/day |
| Swipe engage (lock screen) | +0.5 | Off-chain (passive) | 3 pts/day |
| Click Ad | +0.3 | Off-chain (passive) | 3 pts/day |
| Swipe skip (lock screen) | +0.2 | Off-chain (passive) | 3 pts/day |

#### Multipliers

| Modifier | Condition | Multiplier |
|----------|-----------|------------|
| **Streak Bonus** | 0-2 days | x1.0 |
| | 3-6 days | x1.1 |
| | 7-13 days | x1.15 |
| | 14-29 days | x1.25 |
| | 30+ days (Veteran) | x1.4 |
| **Time Decay** | Active (≤7 days) | x1.0 |
| | Less active (≤30 days) | x0.85 |
| | Rarely active (≤90 days) | x0.6 |
| | Inactive (>90 days) | x0.3 |
| **Diversity** | 5+ action types | x1.2 |
| | 3-4 action types | x1.1 |
| | ≤2 action types | x1.0 |

#### Diminishing Returns

After repeated actions of the same type, each additional action earns less:
- DAO Boost: -15% per action after the 5th
- Talent: -20% after the 3rd
- Feedback: -10% after the 10th
- Subscribe: -25% after the 8th

### User Tiers (0 — 10,000)

| Tier | Score Range | Icon |
|------|------------|------|
| Legend | 5,000+ | Trophy |
| Diamond | 2,500 — 4,999 | Diamond |
| Gold | 1,000 — 2,499 | Star |
| Silver | 300 — 999 | Medal |
| Bronze | 0 — 299 | Shield |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| `anchor build` fails | Ensure Rust, Solana CLI, and Anchor CLI are installed. Run `rustup update`. |
| `npm install` SSL error | `npm config set strict-ssl false`, install, then `npm config set strict-ssl true`. |
| MWA "No wallet found" | Install [Phantom](https://play.google.com/store/apps/details?id=app.phantom) or Solflare on the device. |
| App crash on wallet connect | Verify `AndroidManifest.xml` has the MWA `<queries>` intent filter block. |
| `SDK not found` | Create `android/local.properties` with `sdk.dir=/path/to/Android/sdk`. |
| `@solana/web3.js` crypto error | Ensure `index.js` imports `react-native-get-random-values` and `buffer` before anything else. |
| Token account mismatch | Verify $SKR mint = `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`. |
| First build is slow | Normal: 8-15 min. Subsequent builds: 2-5 min. Incremental: 30-90s. |
| `APP_IDENTITY is not defined` | Already fixed in this version. Check `src/config/constants.js`. |

---

## Contributing

### Workflow

1. **Fork** the repository
2. **Branch**: `git checkout -b feature/my-feature`
3. **Code** your changes
4. **Build**: `anchor build`
5. **Test**: `anchor test`
6. **PR**: Submit a pull request

### Code Style

- **Rust**: `cargo fmt` (standard Rust formatting)
- **JavaScript**: ESLint config included
- **Commits**: Conventional commits (`feat:`, `fix:`, `docs:`, `refactor:`)

### Key Entry Points

| Working on... | Start here |
|---------------|------------|
| Smart contract logic | `programs/deep-pulse/src/instructions/` |
| On-chain data models | `programs/deep-pulse/src/state/` |
| Frontend ↔ chain bridge | `src/services/transactionHelper.js` (screens) |
| Low-level program calls | `src/services/programService.js` |
| Brand moderation flows | `src/services/ModerationService.js` |
| Wallet connection (MWA) | `src/services/walletAdapter.js` |
| App configuration | `src/config/constants.js` |
| Global state | `src/store/appStore.js` |
| Screen UI | `src/screens/` |
| Swipe-to-Earn (native) | `android/.../lockscreen/` |
| Swipe-to-Earn (JS) | `src/services/lockScreenService.js` |

---

## References

- [Solana Mobile Documentation](https://docs.solanamobile.com)
- [Solana Mobile Whitepaper](https://solanamobile.com/whitepaper)
- [Anchor Framework](https://www.anchor-lang.com/)
- [Solana Dev Skill — Security & Testing Best Practices](https://github.com/solana-foundation/solana-dev-skill)
- [SPL Token Program](https://spl.solana.com/token)
- [Mobile Wallet Adapter Protocol](https://docs.solanamobile.com/react-native/using_mobile_wallet_adapter)
- [React Native](https://reactnative.dev)
- [Expo SDK 52](https://docs.expo.dev)
- [Zustand State Management](https://github.com/pmndrs/zustand)

---

## License

MIT License

---

**Version:** 2.0.0
**Anchor:** 0.30.1
**$SKR Mint:** `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`
**Program ID:** `33vWX6efKQSZ98dk3bnbHUjEYhB7LyvbH4ndpKjC6iY4`
**Admin Wallet:** `89Ez94pHfSNAUAPYrN7y3UmEfh4ggxr9biA4AS2nXVZc`
**Status:** Smart contracts compiled + security-audited (18 issues fixed) ✓ | Frontend connected to real on-chain transactions (MWA 2.0) ✓ | SeedVault compatible (Solana Seeker) ✓ | Firebase Cloud Functions deployed (10 functions, us-central1, Node.js 20) ✓ | Firestore Security Rules deployed (client writes for notifications, hubs, subscriptions, fcmTokens) ✓ | Firebase Cloud Messaging ✓ | Firebase Storage (ad upload) ✓ | firebaseService.js backend wiring (two-tier fallback, optimistic UI) ✓ | Swipe-to-Earn LockScreen Overlay ✓ | DEEP Score v2 (anti-farming) ✓ | Push Notification Ads (500 $SKR/week, FCM push, full campaign creation flow) ✓ | DOOH Worldwide (campaign brief form) ✓ | Hub Lifecycle (create → approve → discover) ✓ | My Created Hubs in Profile ✓ | Discord → Hub notification pipeline ✓ | Solscan transaction history ✓ | Global notification mute ✓ | Image Picker (brand ad creatives) ✓ | Real Mock Ad Banners ✓ | Privacy Policy ✓ | English-only UI ✓ | Devnet deploy + init scripts ready ✓ | Release APK built (~57MB) ✓
