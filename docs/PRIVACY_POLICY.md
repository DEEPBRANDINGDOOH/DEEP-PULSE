# DEEP PULSE — Privacy Policy

**Last updated:** February 25, 2026

DEEP PULSE ("we", "our", "the app") is a decentralized notification hub built on the Solana blockchain. This Privacy Policy describes how we collect, use, and protect your information when you use the DEEP PULSE mobile application.

---

## 1. Information We Collect

### 1.1 Wallet Information
- **Public wallet address**: Your Solana wallet public key, used to identify your account on-chain. This is public blockchain data.
- **No private keys**: We never request, store, or access your wallet private keys or seed phrase. All transaction signing is handled by your external wallet app (Phantom, Solflare, etc.) via the Mobile Wallet Adapter protocol.

### 1.2 On-Chain Activity
- Subscription history, feedback submissions, DAO contributions, and ad interactions are recorded on the Solana blockchain. This data is publicly accessible by design (blockchain transparency).

### 1.3 Push Notification Token
- If you enable push notifications, we receive a Firebase Cloud Messaging (FCM) device token. This token is used solely to deliver notifications from hubs you have subscribed to.

### 1.4 Lock Screen Interactions (Swipe-to-Earn)
- If you opt into the Swipe-to-Earn feature, we collect anonymized swipe interaction data (skip vs. engage) to calculate your reward points. No personal data is collected from your lock screen.

### 1.5 Ad Creative Uploads
- If you are a brand uploading ad creatives, images are stored in Firebase Storage under your wallet address. We do not analyze the content of your uploads beyond format validation.

### 1.6 User-Generated Content (Firebase Firestore)
- **Talent submissions**: If you submit a talent profile to a hub, your submission details (skills, description, hub name) are stored in Firestore and visible to hub owners.
- **DAO proposals**: If you create or vote on a DAO Brand Boost proposal, your wallet address and proposal data are stored in Firestore.
- **Hub feedback**: If you send feedback to a hub, your feedback text and wallet address are stored in Firestore for the hub owner to review.
- **Custom deals**: If an admin creates a custom brand deal, deal details are stored in Firestore.
- **DOOH campaigns**: If you submit a Digital Out-of-Home campaign brief, campaign details are stored in Firestore.
- **DEEP Score**: Your DEEP Score, streak, and tier information are stored in Firestore to sync across devices.

---

## 2. Information We Do NOT Collect

- Personal identity (name, email, phone, address)
- Location data
- Contact list or call logs
- Browsing history
- Biometric data
- Financial information beyond on-chain $SKR token transactions

---

## 3. How We Use Your Information

| Data | Purpose |
|------|---------|
| Wallet public key | Identify your account, display subscriptions, manage DEEP Score |
| FCM token | Deliver push notifications from your subscribed hubs |
| Swipe interactions | Calculate Swipe-to-Earn reward points |
| On-chain transactions | Execute hub subscriptions, deposits, DAO contributions, ad purchases |
| Uploaded ad images | Display ad creatives to hub subscribers |
| Talent submissions | Connect users with hub brands for opportunities |
| DAO proposals | Enable community-driven brand sponsorship |
| Hub feedback | Allow users to provide feedback to hub owners |
| DEEP Score | Sync gamification progress across devices |

---

## 4. Data Storage & Security

- **On-chain data**: Stored on the Solana blockchain (immutable, public, decentralized).
- **Push tokens**: Stored temporarily for notification delivery.
- **Ad images**: Stored in Firebase Storage with access controls.
- **Firestore data**: User-generated content (talent submissions, DAO proposals, feedback, DEEP Score) is stored in Firebase Firestore and synced across all devices. This data is associated with your wallet address, not personal identity.
- **Local app data**: Stored on your device via AsyncStorage (subscriptions, theme, wallet session). Cleared when you uninstall the app.
- We do not operate a centralized backend database that stores personal user profiles.

---

## 5. Third-Party Services

| Service | Purpose | Privacy Policy |
|---------|---------|---------------|
| Firebase Cloud Messaging | Push notifications | [Google Privacy Policy](https://policies.google.com/privacy) |
| Firebase Storage | Ad creative file storage | [Google Privacy Policy](https://policies.google.com/privacy) |
| Solana Blockchain | On-chain transactions | Public, decentralized network |
| Phantom / Solflare Wallet | Transaction signing | See respective wallet privacy policies |

---

## 6. Your Rights & Choices

- **Unsubscribe**: You can unsubscribe from any hub at any time. Your subscription PDA is closed and rent is returned.
- **Disable Swipe-to-Earn**: Toggle off at any time from the Swipe-to-Earn screen.
- **Disable notifications**: Revoke notification permissions in your device settings.
- **Delete local data**: Uninstall the app to remove all locally stored data.
- **On-chain data**: Due to the nature of blockchain, on-chain transactions cannot be deleted. However, no personal identity is linked to your wallet address within our app.

---

## 7. Children's Privacy

DEEP PULSE is not intended for children under 13 years of age. We do not knowingly collect information from children.

---

## 8. Changes to This Policy

We may update this Privacy Policy from time to time. Changes will be reflected in the "Last updated" date above. Continued use of the app constitutes acceptance of the updated policy.

---

## 9. Contact

For privacy-related questions or concerns:
- **GitHub**: [DEEP PULSE Repository](https://github.com/your-repo/deep-pulse)
- **Email**: privacy@deeppulse.app

---

**DEEP PULSE v2.0.0** | Built for Solana Mobile Seeker
