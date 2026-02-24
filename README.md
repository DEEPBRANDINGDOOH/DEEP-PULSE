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
| **Users** | Free hub subscriptions, push notifications, submit feedback (300 $SKR deposit), vote on DAO proposals (100 $SKR), discover talent, Swipe-to-Earn on lock screen |
| **Brands** | Create notification hubs (2,000 $SKR/month), moderate content, manage ad slots, receive DAO boost funding |
| **Advertisers** | Purchase top/bottom ad slots with duration-based discounts (up to 40% off), lock screen premium ads (2,000 $SKR/week) |
| **DAO** | Community-funded boost proposals, 95/5 brand/platform split, automatic refunds on cancellation |

### Key Differentiators

- **Fully on-chain** — All business logic enforced by a Solana program, no backend required
- **Solana Mobile native** — Built for MWA 2.0, targets Solana Seeker / Saga
- **Existing token** — Uses the $SKR SPL token (`SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3`), no new token creation
- **Escrow-based deposits** — Tokens locked in PDA escrows until brand moderation resolves
- **Permissionless cranks** — Anyone can trigger vault completion or ad slot expiry
- **Swipe-to-Earn** — Lock screen overlay (WebView HTML5) rewards users for engaging with sponsored content (+5/+10 pts per swipe, max 15/day)

---

## Architecture

```
+-----------------------------------------------------------+
|                    DEEP PULSE PLATFORM                     |
+---------------------------+-------------------------------+
|                           |                               |
|   React Native App        |   Anchor Program (Solana)     |
|   (Solana Mobile)         |   Single Anchor program       |
|                           |   24 instructions             |
|   17 screens              |   8 account types             |
|   MWA 2.0                 |   19 events                   |
|   NativeWind UI           |   30 error codes              |
|   Firebase Cloud Messaging|                               |
|   Zustand store           |                               |
|                           |   +-------------------------+ |
|   programService.js  <----+-->|  deep_pulse program     | |
|   transactionHelper       |   |                         | |
|   walletAdapter           |   |  Admin | Hub | Deposit  | |
|                           |   |  Vault | Ads | Scoring  | |
|                           |   +-------------------------+ |
+---------------------------+-------------------------------+
|          $SKR Token (existing SPL mint on Solana)          |
|          SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3     |
+-----------------------------------------------------------+
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
| **Admin** | Platform admin panel | Built-in |

---

## Getting Started

### Prerequisites

```bash
# Node.js 18+
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
# Output: android/app/build/outputs/apk/release/app-release.apk (~54MB)

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
|       |-- lib.rs                     # Program entry point — 24 instructions
|       |-- constants.rs               # PDA seeds, pricing defaults, scoring
|       |-- errors.rs                  # 30 error codes
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
|   |-- screens/                       # 17 screens
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
|   |   +-- SwipeEarnScreen.js          # Swipe-to-Earn dashboard (lock screen ads)
|   |-- components/
|   |   |-- WalletButton.js            # MWA connect / disconnect + SIWS
|   |   |-- AdRotation.js              # 15-second rotating banner ads
|   |   |-- AlertCard.js               # Notification cards
|   |   +-- ProjectCard.js             # Hub listing cards
|   |-- services/
|   |   |-- programService.js          # Anchor client SDK (PDA helpers + MWA wrappers)
|   |   |-- ModerationService.js       # Brand moderation (on-chain calls)
|   |   |-- walletAdapter.js           # MWA 2.0 (authorize, sign, SIWS, error handling)
|   |   |-- transactionHelper.js       # UI ↔ chain bridge (wallet state, error handling, alerts)
|   |   |-- lockScreenService.js       # Swipe-to-Earn JS bridge (native Android LockScreen module)
|   |   +-- notificationService.js     # Firebase Cloud Messaging (FCM) push notifications
|   |-- store/
|   |   +-- appStore.js                # Zustand + AsyncStorage persist
|   |-- config/
|   |   |-- constants.js               # App config, pricing, $SKR mint, scoring
|   |   +-- deep_pulse_idl.json        # Anchor IDL (24 instructions, imported locally)
|   |-- data/
|   |   +-- mockData.js                # Development mock data
|   +-- utils/
|       +-- i18n.js                    # Internationalization
|
|-- android/                            # Android native project
|-- android-config/                     # Pre-configured Android files (MWA ready)
|-- web-preview/                        # Browser preview (no emulator needed)
|-- idl/
|   +-- deep_pulse.json                # Anchor IDL (24 instructions, auto-generated)
|-- Anchor.toml                         # Anchor config (cluster, wallet, scripts)
|-- Cargo.toml                          # Rust workspace
|-- package.json                        # JS dependencies
|-- app.json                            # Expo / React Native config (SDK 52)
|-- metro.config.js                     # Metro bundler + crypto polyfills
|-- index.js                            # Entry point (polyfills loaded first)
|-- tsconfig.json                       # TypeScript config (tests)
|-- SMART_CONTRACTS.md                  # Detailed smart contract docs (French)
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
| **Total** | **24** | (including renew_hub_subscription) |

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
| `UserScore` | `["user_score", user]` | 66 B | ~0.001 SOL |

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

### All 24 Instructions

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

**Scoring hooks** are embedded in other instructions:

| Action | Triggered by | Points |
|--------|-------------|--------|
| Subscribe | `subscribe_to_hub` | +10 |
| Feedback | `create_deposit(Feedback)` | +25 |
| Talent | `create_deposit(Talent)` | +30 |
| DAO Boost | `contribute_to_vault` | +50 |

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

## Configuration

### Key Constants

| Constant | Value | Where to change |
|----------|-------|-----------------|
| **Program ID** | `33vWX6efKQSZ98dk3bnbHUjEYhB7LyvbH4ndpKjC6iY4` | `lib.rs`, `Anchor.toml`, `constants.js`, `programService.js` |
| **$SKR Mint** | `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` | `constants.rs`, `constants.js`, `programService.js` |
| Hub Subscription | 2,000 $SKR/month | `constants.rs`, `constants.js` |
| Feedback Deposit | 300 $SKR | `constants.js` (overrides default 400 in `constants.rs`) |
| DAO Proposal Deposit | 100 $SKR | `constants.rs`, `constants.js` |
| Talent Deposit | 50 $SKR | `constants.rs`, `constants.js` |
| Top Ad Price | 1,500 $SKR/week | `constants.js` |
| Bottom Ad Price | 800 $SKR/week | `constants.js` |
| Lock Screen Ad | 2,000 $SKR/week | `constants.js` |
| Global Notification | 1,000 $SKR | `constants.js` |
| DAO Brand Share | 95% (9500 bps) | `constants.rs` |
| DAO Platform Share | 5% (500 bps) | `constants.rs` |
| Min Vault Contribution | 10 $SKR | `constants.rs` |
| **Admin Wallet** | `89Ez94...nXVZc` | `constants.js` |

### Environment

| Setting | Development | Production |
|---------|-------------|------------|
| RPC Endpoint | `https://api.devnet.solana.com` | `https://api.mainnet-beta.solana.com` |
| MWA Cluster | `solana:devnet` | `solana:mainnet-beta` |
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
# One-command deploy (handles airdrop + deploy)
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

### Step 3 — Deploy to Local Validator (for testing)

```bash
solana-test-validator --reset
solana config set --url localhost
solana airdrop 10
solana program deploy target/deploy/deep_pulse.so \
  --program-id target/deploy/deep_pulse-keypair.json
```

### Step 4 — Initialize Platform

Call `initialize_platform` passing the existing $SKR mint:

```bash
anchor test --skip-local-validator
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
| **Explicit init** | No `init_if_needed` except `VaultContribution` (multiple deposits by design) |
| **Account closure** | `close = destination` returns rent to the correct party |
| **Discriminators** | Anchor 8-byte discriminators prevent account confusion |
| **Config validation** | `brand_bps + platform_bps == 10000` enforced at init and update |
| **Mint validation** | Every token account checks `mint == platform_config.skr_mint` |
| **MWA compliance** | `onWalletNotFound` handler + `authorize` in every `transact()` session |
| **Polyfills** | `react-native-get-random-values` + `buffer` loaded before `@solana/web3.js` |

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

### Deposit Economics

| Action | User Deposits | On Approve | On Reject |
|--------|---------------|------------|-----------|
| Feedback | 300 $SKR | Full refund to user | Sent to treasury |
| DAO Proposal | 100 $SKR | Full refund + vault created | Sent to treasury |
| Talent | 50 $SKR | Full refund to user | Sent to treasury |

### On-Chain Scoring

| Action | Points | Instruction |
|--------|--------|-------------|
| Subscribe to hub | +10 | `subscribe_to_hub` |
| Submit feedback | +25 | `create_deposit(Feedback)` |
| Submit talent | +30 | `create_deposit(Talent)` |
| DAO vault contribution | +50 | `contribute_to_vault` |

Notification reads and ad clicks are scored off-chain (too frequent for on-chain tx cost).

### User Tiers

| Tier | Score Range |
|------|------------|
| Legend | 901 — 1000 |
| Diamond | 751 — 900 |
| Gold | 501 — 750 |
| Silver | 251 — 500 |
| Bronze | 0 — 250 |

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
**Status:** Smart contracts compiled + frontend connected to real on-chain transactions (MWA enabled ✓) | Firebase Cloud Messaging ✓ | Swipe-to-Earn LockScreen Overlay ✓ | Release APK built (~54MB) ✓
