# DEEP PULSE — Pitch Deck
## Web3 Notification Hub for Solana Mobile

---

### SLIDE 1 — COVER

**DEEP PULSE**
*The Decentralized Notification Hub for Solana Mobile*

Built for Solana Seeker | $SKR Token | Anchor Smart Contracts
Hackathon Submission — March 2026

---

### SLIDE 2 — THE PROBLEM

**Web3 notifications are broken.**

- Users miss critical DeFi alerts, governance votes, and NFT drops
- Brands have no native way to reach on-chain users on mobile
- Push notification systems are centralized (OneSignal, Firebase alone)
- No economic incentive for users to engage with notifications
- No quality filter — users are spammed with irrelevant content

**Result:** Low engagement, missed opportunities, fragmented communication.

---

### SLIDE 3 — THE SOLUTION

**DEEP PULSE: A fully on-chain notification marketplace.**

| For Users | For Brands | For Advertisers |
|-----------|-----------|-----------------|
| Subscribe to hubs for FREE | Create notification hubs (2,000 $SKR/month) | Purchase rotating ad slots |
| Earn DEEP Score points via Swipe-to-Earn | Moderate content & manage community | Upload creatives directly from device |
| Submit feedback (300 $SKR deposit) | Receive DAO boost funding (95/5 split) | Duration-based discounts (up to 40% off) |
| Vote on DAO proposals | Analytics dashboard | Lock screen premium ads |
| DEEP Score ranks real contributors | Admin review for quality control | Impression & click tracking |
| | Hub lifecycle (create -> approve -> Discover) | Rich Notification Ads (500 $SKR/campaign, FCM push) |
| | DOOH Worldwide campaign briefs | DOOH digital billboard campaigns |

---

### SLIDE 4 — HOW IT WORKS

```
1. BRAND creates a Hub (pays 2,000 $SKR)
          |
2. USERS subscribe for free (on-chain PDA)
          |
3. BRAND sends notifications via Firebase FCM
          |
4. USERS engage: read, feedback, vote, swipe
          |
5. ADVERTISERS buy ad slots (top/bottom/lockscreen/rich notification/DOOH)
          |
6. COMMUNITY funds DAO boost proposals
          |
7. DEEP SCORE ranks real contributors (anti-farming)
```

---

### SLIDE 5 — ARCHITECTURE

```
+-----------------------------------------------------------+
|                    DEEP PULSE PLATFORM                     |
+---------------------------+-------------------------------+
|   React Native App        |   Anchor Program (Solana)     |
|   19 screens              |   23 instructions             |
|   MWA 2.0                 |   8 account types             |
|   NativeWind UI           |   19 events                   |
|   Firebase (FCM + Storage)|   33 error codes              |
|   Zustand persistence     |   SPL Token ($SKR)            |
+---------------------------+-------------------------------+
|          $SKR Token (existing SPL mint on mainnet)         |
|          SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3     |
+-----------------------------------------------------------+
```

**Key technical decisions:**
- Single monolithic Anchor program (no CPI complexity)
- Existing $SKR token (no new token creation)
- MWA 2.0 for Phantom/Solflare integration
- Firebase for push + storage (battle-tested infrastructure)
- NativeWind for consistent Tailwind-based UI

---

### SLIDE 6 — ECONOMIC MODEL

**Revenue Streams:**

| Source | Amount ($SKR) | Frequency |
|--------|--------------|-----------|
| Hub creation | 2,000 | Per hub |
| Hub renewal | 2,000 | Monthly |
| Rejected deposits | 50-300 | Per rejection (treasury) |
| DAO vault fee | 5% of total | Per completed vault |
| Top ad slot | 1,500 | Per week |
| Bottom ad slot | 800 | Per week |
| Lock screen ad | 2,000 | Per week |
| Rich Notification Ad | 500 | Per campaign (FCM push) |

**Token Flow:**
- All payments in $SKR (existing Seeker token)
- Deposits locked in PDA escrows until resolution
- DAO vaults: 95% to brand, 5% to platform treasury
- No token inflation — uses existing supply

---

### SLIDE 7 — DEEP SCORE v2 (Anti-Farming)

**The problem with Web3 scoring:** Bots farm points by repeating cheap actions.

**Our solution:** Diminishing returns + daily caps + streak bonuses + diversity multipliers.

| Mechanism | How It Works |
|-----------|-------------|
| **Diminishing Returns** | Each repeated action earns less (-10% to -25% after threshold) |
| **Daily Caps** | Max points per category per day (e.g., 3 pts/day lockscreen) |
| **Streak Bonus** | 30+ day streak = x1.4 multiplier |
| **Time Decay** | Inactive >90 days = x0.3 penalty |
| **Diversity** | 5+ action types = x1.2 bonus |

**5 Tiers:** Bronze (0-299) -> Silver -> Gold -> Diamond -> Legend (5,000+)

---

### SLIDE 8 — SWIPE-TO-EARN (Lock Screen)

**Users earn DEEP Score points by interacting with lock screen ads.**

- Full-screen ad overlay on Android lock screen
- Swipe right = skip (+0.2 pts)
- Swipe left = engage (+0.5 pts)
- Max 15 ads/day, 3/hour (anti-spam)
- Brands upload creatives via in-app image picker
- Images stored in Firebase Storage (production-ready)
- Native Android foreground service (survives app close)

**Why it matters for Seeker:** This is a NATIVE mobile feature that only works on Android — perfect differentiator for Solana Mobile ecosystem.

---

### SLIDE 9 — AD SLOTS (Brand Revenue)

**3 ad slot types:**

| Type | Price | Dimensions | Max Slots |
|------|-------|-----------|-----------|
| Top Banner | 1,500 $SKR/week | 390x120 px | 8 (rotates every 15s) |
| Bottom Banner | 800 $SKR/week | 390x100 px | 8 (rotates every 15s) |
| Lock Screen | 2,000 $SKR/week | 1080x1920 px | 4 (full screen) |

**Upload flow:**
1. Brand selects image from gallery (react-native-image-picker)
2. Image validated (format, size, dimensions)
3. Uploaded to Firebase Storage (CDN delivery)
4. URL stored on-chain in ad slot PDA
5. Admin review before going live
6. Volume discounts: 4+ weeks = 10-40% off

---

### SLIDE 10 — RICH NOTIFICATION ADS & DOOH WORLDWIDE

**Rich Notification Ads (500 $SKR/campaign):**

- Push notification ads delivered via Firebase Cloud Messaging
- Works on ALL devices including Solana Seeker — no SYSTEM_ALERT_WINDOW permission needed
- Brands create campaigns with title, body, image, and call-to-action
- Reaches every subscriber's notification tray instantly
- Lower barrier to entry than banner or lock screen ads

**DOOH Worldwide (Digital Out-Of-Home):**

- Campaign brief form accessible from HubDashboard
- Brands define target locations, formats (billboards, screens, transit), budget, and duration
- Bridges on-chain brand activity with real-world advertising
- Global reach — not limited to mobile screens

**Hub Lifecycle:**
```
Brand creates hub (2,000 $SKR) → Added to Admin Pending Queue
         → Admin Reviews & Approves → Hub appears on Discover
         → Users subscribe for free
```

---

### SLIDE 11 — DEMO

**19 fully functional screens:**

1. Onboarding (redesigned: hero with pulse animation, features showcase, DEEP Score tiers, "Let's grow together")
2. Home (notification feed + real mock ad banners)
3. Discover (browse & subscribe to hubs)
4. My Hubs (subscribed hubs synced via Zustand)
5. Notifications (push notification list)
6. Notification Detail (feedback submission)
7. Profile (wallet, DEEP Score, tier badge)
8. Hub Dashboard (brand management + Discord + DOOH access)
9. Brand Moderation (approve/reject deposits)
10. Brand Boost (DAO proposal management)
11. DAO Boost (community vault funding)
12. Talent (talent marketplace)
13. Ad Slots (purchase + upload creatives)
14. Admin Panel (platform administration)
15. Admin Messages (admin <-> brand communication)
16. Hub Notifications (hub-specific feed)
17. Swipe-to-Earn (lock screen dashboard)
18. DOOH Screen (Digital Out-Of-Home campaign brief form)
19. Rich Notification Ads (push notification ad campaigns)

**Both APKs available:**
- Debug APK (132 MB) — mock fallbacks for testing
- Release APK (54 MB) — mainnet-ready, real transactions

---

### SLIDE 12 — COMPETITIVE ADVANTAGE

| Feature | DEEP PULSE | EPNS/Push Protocol | Dialect | WalletConnect |
|---------|-----------|-------------------|---------|---------------|
| Solana Mobile native | YES | No | Partial | No |
| On-chain subscriptions | YES | Yes | No | No |
| Lock screen ads | YES | No | No | No |
| $SKR token integration | YES | Own token | No token | No |
| Anti-farming scoring | YES | No | No | No |
| Brand ad marketplace | YES | No | No | No |
| DAO boost vaults | YES | No | No | No |
| Image upload for ads | YES | No | No | No |
| Discord → Hub pipeline | YES | No | No | No |

---

### SLIDE 13 — ROADMAP

| Phase | Timeline | Deliverables |
|-------|----------|-------------|
| **v2.0 (Current)** | March 2026 | 19 screens, 23 smart contract instructions, MWA 2.0, Swipe-to-Earn, DEEP Score v2, Firebase push + storage, Discord → Hub pipeline, Rich Notification Ads, DOOH Worldwide, Hub Lifecycle |
| **v2.1** | April 2026 | Mainnet deployment, dApp Store submission, backend API for analytics |
| **v2.2** | Q2 2026 | Real-time notification feed (WebSocket), advanced analytics dashboard |
| **v3.0** | Q3 2026 | Cross-chain notifications (EVM bridge), iOS support, Arweave decentralized storage |

---

### SLIDE 14 — TEAM & LINKS

**Solo Builder** — Gilles Beselto

**Links:**
- GitHub: [Repository URL]
- Privacy Policy: /docs/PRIVACY_POLICY.md
- Smart Contract Docs: /SMART_CONTRACTS.md

**Tech Stats:**
- 23 smart contract instructions
- 19 mobile screens
- 8 on-chain account types
- 33 custom error codes
- 19 on-chain events
- 6 services (program, wallet, transaction, notification, lockscreen, storage)

---

### SLIDE 14 — ASK

**What we need:**
1. Mainnet SOL for program deployment (~4.37 SOL rent)
2. dApp Store listing approval
3. Beta testers on Solana Seeker devices
4. Brand partnerships for launch hubs

**Built on Solana Mobile. Powered by $SKR. Ready for mainnet.**

---

*DEEP PULSE v2.0.0 | Solana Mobile Seeker Hackathon 2026*
