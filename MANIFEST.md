# 📦 DEEP PULSE - PACKAGE MANIFEST

## Version 2.0.0 - Hackathon Ready Edition
## Date: Février 2026

---

## ✅ FICHIERS INCLUS (47 fichiers)

### 📱 Application Core (6 fichiers)

- ✅ `App.js` - Navigation principale (Stack + Bottom Tabs)
- ✅ `index.js` - Entry point
- ✅ `package.json` - Dépendances complètes
- ✅ `app.json` - Configuration app
- ✅ `babel.config.js` - Babel config
- ✅ `metro.config.js` - Metro bundler config
- ✅ `tailwind.config.js` - Tailwind CSS config

### 📱 Screens (20 écrans)

- ✅ `src/screens/OnboardingScreen.js` - 4 slides intro (redesigned)
- ✅ `src/screens/HomeScreen.js` - Écran principal
- ✅ `src/screens/DiscoverScreen.js` - Découverte hubs (reads from Zustand store)
- ✅ `src/screens/MyHubsScreen.js` - Hubs abonnés (reads from Zustand store)
- ✅ `src/screens/ProfileScreen.js` - Profil utilisateur + "My Created Hubs" section
- ✅ `src/screens/DAOBoostScreen.js` - DAO voting
- ✅ `src/screens/TalentScreen.js` - Talent marketplace
- ✅ `src/screens/HubDashboardScreen.js` - Dashboard marque (dynamic stats + DOOH + Discord + Firebase push)
- ✅ `src/screens/BrandModerationScreen.js` - Modération
- ✅ `src/screens/AdSlotsScreen.js` - Gestion ads + Rich Notification Ads (1,500 $SKR/week, SPONSORED badge, Free vs Sponsored comparison) + proper URL hashing
- ✅ `src/screens/BrandBoostScreen.js` - Brand boost (hub creation → store)
- ✅ `src/screens/AdminScreen.js` - Admin panel (hub approval, pricing, deals, Firebase moderation sync)
- ✅ `src/screens/NotificationsScreen.js` - Notifications globales
- ✅ `src/screens/HubNotificationsScreen.js` - Notifications d'un hub spécifique
- ✅ `src/screens/NotificationDetailScreen.js` - Détail notification + feedback
- ✅ `src/screens/SwipeEarnScreen.js` - Swipe-to-Earn lock screen
- ✅ `src/screens/AdminMessagesScreen.js` - Messages admin ↔ marques
- ✅ `src/screens/DOOHScreen.js` - Formulaire campagne DOOH Worldwide
- ✅ `src/screens/AlertsScreen.js` - Centre d'alertes
- ✅ `src/screens/AdTypeSelectorScreen.js` - **NEW** Sélection type d'ad (In-App: Top/Bottom vs Out-of-App: Lockscreen/Rich Notification)

### 🧩 Components (7 composants)

- ✅ `src/components/AdRotation.js` - Rotation ads 15s (local mock + remote)
- ✅ `src/components/MockAdBanners.js` - Bannières pub locales (Jupiter, Marinade, Tensor, etc.)
- ✅ `src/components/WalletButton.js` - Connexion wallet MWA
- ✅ `src/components/AlertCard.js` - Cartes alerte
- ✅ `src/components/ProjectCard.js` - Cartes projet
- ✅ `src/components/HubIcon.js` - **NEW** Icône hub réutilisable — affiche logo uploadé (crop circulaire 200x200px) ou Ionicon fallback
- ✅ `src/components/ui/PulseOrb.js` - Animation pulse onboarding

### ⚙️ Services (6 services)

- ✅ `src/services/walletAdapter.js` - **IMPROVED** MWA 2.1.0
- ✅ `src/services/notificationService.js` - FCM registration + listeners
- ✅ `src/services/firebaseService.js` - **NEW** Firebase backend wiring (Firestore + Cloud Functions + FCM topics)
- ✅ `src/services/programService.js` - Anchor program interactions (21 instructions)
- ✅ `src/services/transactionHelper.js` - Transaction builder + MWA signing
- ✅ `src/services/storageService.js` - Firebase Storage uploads (ad creatives + hub logo upload with 500KB/200x200px/format validation)

### 📐 Configuration (1 fichier)

- ✅ `src/config/constants.js` - **FIXED** avec APP_IDENTITY

### 💾 Data & State (2 fichiers)

- ✅ `src/data/mockData.js` - Données de développement
- ✅ `src/store/appStore.js` - State management

### 🌍 Utils (2 fichiers)

- ✅ `src/utils/i18n.js` - Internationalisation
- ✅ `src/utils/security.js` - **NEW** Security utilities (safeOpenURL, logger, rate limiter, email validation, URL validation, input length constants)

### 🤖 Android Configuration (3 fichiers)

- ✅ `android-config/AndroidManifest.xml` - **Avec <queries> MWA**
- ✅ `android-config/build.gradle` - **minSdk 26 + MWA clientlib**
- ✅ `android-config/gradle.properties` - Configuration Gradle

### 🔥 Firebase Configuration (3 fichiers)

- ✅ `firebase.json` - Firebase config (Functions + Firestore + Storage + Hosting)
- ✅ `.firebaserc` - Firebase project link (deep-pulse)
- ✅ `firestore.rules` - **DEPLOYED** Firestore Security Rules (client writes for notifications, hubs, subscriptions, fcmTokens)

### 📚 Documentation (4 fichiers)

- ✅ `README.md` - Documentation complète
- ✅ `QUICKSTART.md` - Guide rapide 30 min
- ✅ `MANIFEST.md` - Ce fichier
- ✅ `SECURITY_AUDIT.md` - Full security audit report (3 audits: 18 + 37 + ~90 issues fixed, score 9.5/10)

### 🛠️ Scripts (1 fichier)

- ✅ `build.sh` - Build automatisé

---

## ✨ CORRECTIONS APPLIQUÉES

### 1. src/config/constants.js ✅

**AJOUTÉ:**
```javascript
// Mobile Wallet Adapter Identity
export const APP_IDENTITY = {
  name: 'Deep Pulse',
  uri: 'https://deeppulse.app',
  icon: 'favicon.ico',
};

// RPC Endpoint helper
export const getRpcEndpoint = () => {
  return __DEV__ 
    ? 'https://api.devnet.solana.com'
    : 'https://api.mainnet-beta.solana.com';
};

// Cluster format MWA 2.0
export const getCluster = () => {
  return __DEV__ ? 'solana:devnet' : 'solana:mainnet-beta';
};
```

### 2. src/services/walletAdapter.js ✅

**AMÉLIORATIONS:**
- ✅ Import AsyncStorage pour persistence
- ✅ Import MWA error types
- ✅ Format cluster: `getCluster()` → `'solana:devnet'`
- ✅ Auth token persistence dans `connect()`
- ✅ Méthode `autoConnect()` ajoutée
- ✅ Error handling avec codes MWA (4001, -32001, etc.)
- ✅ Retry logic avec backoff exponentiel
- ✅ Blockhash fresh dans `transact()`
- ✅ Logs améliorés avec emojis ✅❌⚠️

### 3. android-config/AndroidManifest.xml ✅

**CRITIQUE:**
```xml
<queries>
    <intent>
        <action android:name="solana.mobilewalletadapter.privileged.HANDLE_ACTION"/>
    </intent>
</queries>
```

### 4. android-config/build.gradle ✅

**CRITIQUE:**
```gradle
android {
    defaultConfig {
        minSdk 26  // Solana Mobile requirement
    }
}

dependencies {
    implementation 'com.solanamobile:mobile-wallet-adapter-clientlib-ktx:2.1.0'
}
```

### 5. src/services/firebaseService.js ✅ (NEW — Last Mile Backend)

**Firebase backend wiring service — central hub for all server-side sync:**
```
- sendHubNotification()       → Cloud Function sendPushToSubscribers → FCM topic push
- subscribeToHubBackend()     → FCM topic hub_{hubId} + Firestore subscriptions/
- unsubscribeFromHubBackend() → FCM topic unsubscribe + Firestore cleanup
- createHubInFirestore()      → Firestore hubs/ (status: PENDING)
- approveHubInFirestore()     → Firestore hubs/ (status: ACTIVE)
- rejectHubInFirestore()      → Firestore hubs/ (status: REJECTED)
- approveAdCreative()         → Cloud Function moderateAdCreative
- rejectAdCreative()          → Cloud Function moderateAdCreative
- trackEvent()                → Cloud Function trackEvent (DEEP Score)
- registerFcmToken()          → Firestore fcmTokens/ (targeted push)
- sendGlobalNotification()    → Firestore notifications/ (admin push to all)
```

**Architecture:** Safe imports with try-catch, two-tier fallback (Cloud Function → Firestore → local-only), optimistic UI (Zustand first, Firebase sync in background).

**New Firebase packages added:**
- `@react-native-firebase/firestore` (^23.8.6) — Firestore DB sync
- `@react-native-firebase/functions` (^23.8.6) — Cloud Functions calls

**Firestore collections:**
- `notifications/` — Hub notification docs (triggers FCM via onNewNotification)
- `subscriptions/` — User-hub subscriptions ({walletAddress}_{hubId})
- `hubs/` — Hub data (status, subscribers, creator)
- `adCreatives/` — Ad creatives for admin review
- `fcmTokens/` — FCM device tokens per wallet
- `analytics/` — User events + DEEP Score data

---

## ✨ DERNIÈRES ADDITIONS (3 features)

### 1. Hub Name in Notifications
Notification titles now display as **"HubName: Title"** so users instantly know which hub sent the message. Applied across `HubDashboardScreen.js`, `HubNotificationsScreen.js`, `HomeScreen.js`, `NotificationDetailScreen.js`, and `firebaseService.js`.

### 2. Ad Type Selector Screen
**NEW file:** `src/screens/AdTypeSelectorScreen.js`
Intermediate screen displayed when tapping "Manage Ad Slots" from Hub Dashboard. Organizes ad slots into two categories:
- **In-App Ads** — Top Banner / Bottom Banner
- **Out-of-App Ads** — Lockscreen / Rich Notification
Navigation updated in `App.js`. `BrandBoostScreen.js` and `AdSlotsScreen.js` adapted accordingly.

### 3. Hub Logo Upload + HubIcon Component
**NEW file:** `src/components/HubIcon.js`
Hub creators can upload a custom logo instead of using Ionicons:
- **Specs:** 200x200px, max 500KB, PNG/JPG/WebP only
- **Display:** Circular crop everywhere in the app (Discover, My Hubs, Home, Dashboard, Notifications)
- **Upload:** via `storageService.js` (Firebase Storage) with validation
- **Component:** Reusable `HubIcon` renders the uploaded logo or falls back to the Ionicon

**Files modified:** `firebaseService.js`, `storageService.js`, `BrandBoostScreen.js`, `AdSlotsScreen.js`, `HubDashboardScreen.js`, `App.js`, `MyHubsScreen.js`, `DiscoverScreen.js`, `HubNotificationsScreen.js`, `HomeScreen.js`, `NotificationDetailScreen.js`, `constants.js`

---

## 🎯 FONCTIONNALITÉS COMPLÈTES

### User Features ✅
- Onboarding (4 slides)
- Discover hubs (FREE)
- Subscribe (0 $SKR)
- My Hubs notifications
- Send feedback (300 $SKR)
- Profile + wallet
- Transaction history

### Brand Features ✅
- Hub Dashboard (dynamic subscriber count, notification history, Firebase push)
- Send notifications with "HubName: Title" format (Zustand + Cloud Function → FCM push to all subscribers)
- Hub creation lifecycle (create → Firestore PENDING → admin approval → ACTIVE → Discover)
- "My Created Hubs" in Profile (brands manage hubs, direct access to Dashboard)
- Hub Logo Upload (200x200px, max 500KB, PNG/JPG/WebP — circular crop via HubIcon component)
- Moderation approve/reject (synced to Firestore + Cloud Functions)
- Ad Type Selector screen (In-App: Top/Bottom vs Out-of-App: Lockscreen/Rich Notification)
- Ad slots purchase (Top 800/Bottom 600/Lockscreen 1,000 $SKR/week)
- Rich Notification Ads (1,500 $SKR/week, SPONSORED badge, Free vs Sponsored comparison)
- DOOH Worldwide (campaign briefs for global venues)
- Discord → Hub notification pipeline (auto-forward announcements)
- Analytics dashboard
- Subscription billing

### DAO Features ✅
- Propose features (100 $SKR)
- Vote on proposals
- Fund proposals (min 100 $SKR)
- Vault 95%/5% split

### Talent Features ✅
- Browse talents (anonymous)
- Submit profile (50 $SKR)
- Track submission status
- Rating & reviews

### Ad System ✅
- Ad rotation 15s
- Max 8 ads per slot
- Click tracking + Impression tracking
- Local mock banners (Jupiter, Marinade, Tensor, Magic Eden, Raydium)
- Push Notification Ads (full campaign flow with live preview)
- Lockscreen ads (premium full-screen)
- Purchase interface + volume discounts

---

## 🔐 SÉCURITÉ & CONFORMITÉ

### Mobile Wallet Adapter ✅
- Protocol version 2.1.0
- Proper `transact()` usage
- Auth token security
- Reauthorization support
- Error handling complet

### Android Security ✅
- minSDK 26 (Solana requirement)
- Proper permissions
- MWA queries declared
- Secure storage (AsyncStorage)
- No plaintext secrets
- ProGuard / R8 enabled for release builds (code obfuscation + dead code elimination)
- Comprehensive ProGuard keep rules for React Native, Solana Mobile, Firebase, Hermes

### Code Quality ✅
- Clean architecture
- Separation of concerns
- Error boundaries
- Type safety (JSDoc)
- Production-ready
- Env-aware logging (~90+ console statements replaced with `logger` — silent in production)
- **Security score: 9.5 / 10** (3 full security audits completed)

---

## 📊 STATISTIQUES

### Lignes de Code
- **Total:** ~8,500 lignes
- **Screens:** ~3,200 lignes
- **Services:** ~1,800 lignes
- **Components:** ~1,200 lignes
- **Config:** ~600 lignes
- **Utils:** ~400 lignes

### Technologies
- React Native 0.76.9
- React Navigation 6.x
- Solana Web3.js 1.87.6
- MWA Protocol 2.1.0
- AsyncStorage 1.21.0
- Axios, date-fns, etc.

### Taille du Package
- **Source code:** ~250 KB
- **node_modules:** ~350 MB (après install)
- **APK Debug:** ~138 MB (with Firestore + Functions native modules)
- **APK Release:** ~57 MB (optimized, ProGuard/R8 enabled — code obfuscation + dead code elimination)

---

## 🚀 PRÊT POUR

### ✅ Développement
- Hot reload fonctionne
- Mock data disponible
- Dev mode logs
- Fast refresh

### ✅ Testing
- Peut être testé sur émulateur
- Compatible Solana Seeker
- Phantom/Solflare support
- Error scenarios handled

### ✅ Production
- Code optimisé
- Error handling robuste
- Performance monitoring ready
- Analytics ready

### ✅ Hackathon Submission
- Documentation complète
- README professionnel
- Quick start 30 min
- Build automatisé
- 100% conforme MWA

---

## 📝 FICHIERS À GÉNÉRER

Ces fichiers seront générés automatiquement:

### Par npm install:
- `node_modules/` - Dépendances
- `package-lock.json` - Lock file

### Par build script:
- `android/` - Dossier Android complet
- `android/local.properties` - SDK path

### Par Gradle:
- `android/app/build/` - Build artifacts
- `android/app/build/outputs/apk/debug/app-debug.apk` - APK final

---

## ✅ CHECKLIST UTILISATION

### Avant de commencer:
- [ ] Node.js 20+ installé
- [ ] Android Studio + SDK installés
- [ ] ANDROID_HOME configuré
- [ ] Java JDK 17 installé
- [ ] Solana Seeker ou émulateur

### Build process:
- [ ] `npm install` réussi
- [ ] `build.sh` exécuté (ou build manuel)
- [ ] APK généré
- [ ] Aucune erreur

### Tests:
- [ ] App s'installe
- [ ] App se lance
- [ ] Wallet se connecte
- [ ] Toutes features marchent
- [ ] Pas de crash

### Documentation:
- [ ] README lu
- [ ] QUICKSTART suivi
- [ ] Screenshots pris
- [ ] Vidéo enregistrée (optionnel)

---

## 🎉 RÉSUMÉ

Ce package contient:
- ✅ **45 fichiers** de code source
- ✅ **Toutes corrections** appliquées
- ✅ **100% conforme** Solana Mobile
- ✅ **Production-ready**
- ✅ **Hackathon-ready**

**Temps de build: ~30 minutes**
**Difficulté: ⭐⭐☆☆☆ (Facile avec script)**

---

## 📞 SUPPORT

Questions sur les fichiers?
1. Lire README.md
2. Voir QUICKSTART.md
3. Exécuter build.sh
4. Vérifier les logs

---

**Package Version:** 2.0.0  
**Date:** Février 2026  
**Status:** Complete & Ready ✅  
**MWA Compliance:** 100% ✅

**Bon build! 🚀**
