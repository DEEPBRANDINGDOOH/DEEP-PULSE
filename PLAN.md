# Plan d'implementation - 7 features

## Feature 1: Ad Moderation Admin (Approbation des pubs)
**Fichiers: AdminScreen.js, appStore.js, constants.js**

### Ce qui change:
- Ajouter une nouvelle section "Ad Moderation" dans AdminScreen (bouton Quick Action + ecran)
- Mock data: MOCK_PENDING_ADS avec: adId, brandName, brandWallet, hubName, slotType, imageUrl, landingUrl, duration, totalCost, status (PENDING/APPROVED/REJECTED/SPAM), submittedDate
- Chaque pub affiche: preview image, landing URL (clickable), brand wallet, slot type, duration, cost
- 3 actions: **Approve** (pub va en diffusion), **Reject** (rembourser manuellement), **Flag as Spam** (conserver les fonds)
- Approve = statut APPROVED, Alert "Ad approved and now live"
- Reject = statut REJECTED, Alert "Ad rejected. Refund wallet: {wallet} - {cost} $SKR"
- Spam = statut SPAM, Alert confirm "Flag as spam and retain funds?"

### Flow:
Quand un annonceur achete un ad slot (AdSlotsScreen), au lieu de "Your ad will start showing immediately", ca dit "Your ad has been submitted for review. It will go live once approved by the admin."

## Feature 2: Messagerie Admin <-> Marques
**Fichiers: AdminScreen.js, HubDashboardScreen.js, nouveau fichier: AdminMessagesScreen.js**

### Ce qui change:
- Nouvelle section "Messages" dans Admin Quick Actions (avec badge count)
- Nouveau screen `AdminMessagesScreen.js` avec:
  - Liste des conversations (une par hub/marque)
  - Chaque conversation montre: hubName, lastMessage preview, timestamp, unread count
  - Vue conversation: messages en bulles (admin = droite/orange, marque = gauche/gris)
  - Input text + bouton send en bas
  - Possibilite de taguer le message: "General", "Ad Review", "Account"
- Cote HubDashboard (marque): Ajouter un Quick Action "Messages from Admin" qui ouvre la meme vue conversation
- Navigation: nouveau Stack.Screen "AdminMessages" dans App.js
- Mock data: MOCK_CONVERSATIONS avec messages admin et marque

## Feature 3: Modification de visuel en cours de campagne + re-approbation
**Fichier: AdSlotsScreen.js**

### Ce qui change:
- Ajouter une section "My Active Ads" en haut du screen (si wallet connected)
- Chaque ad active montre: preview, slot type, remaining days, status (APPROVED/PENDING_REVIEW)
- Bouton "Edit Creative" sur chaque ad active
- Au clic: modal avec champs imageUrl + landingUrl pre-remplis
- Validation technique de l'image URL (regex dimensions dans le nom, format check)
- Apres submit: statut passe a PENDING_REVIEW, Alert "Your updated ad has been resubmitted for admin review. Your current ad continues to run until the new one is approved."

## Feature 4: Validation technique des visuels publicitaires
**Fichier: AdSlotsScreen.js**

### Ce qui change:
- Fonction `validateAdCreative(imageUrl, slotType)` qui verifie:
  - URL valide (http/https)
  - Extension fichier: .png, .jpg, .jpeg, .gif uniquement
  - Pas de fichier video (.mp4, .mov, .webm)
  - Taille max: 2MB (info dans le message, pas verifiable cote client sans fetch)
- Messages d'erreur specifiques:
  - "Invalid file format. Accepted: PNG, JPG, GIF only"
  - "URL must start with https://"
  - "Image URL is required"
- Afficher les specs techniques dans un encadre rouge si erreur, vert si OK
- Appliquer la validation avant le confirm purchase ET avant le edit creative

## Feature 5: MyHubs -> clic sur hub = voir les notifications du hub
**Fichiers: MyHubsScreen.js, NotificationsScreen.js, nouveau: HubNotificationsScreen.js**

### Ce qui change:
- `handleHubClick` dans MyHubsScreen navigue vers `HubNotifications` au lieu de `HubDashboard`
- Nouveau screen `HubNotificationsScreen.js`:
  - Header: hub icon + hub name + subscriber count
  - Liste des notifications du hub (filtrees par hubName)
  - Chaque notif = card clickable (ouvre detail, voir Feature 6)
  - Bouton "Send Feedback" sur chaque notif (300 $SKR)
  - Bouton "Hub Dashboard" en haut (pour les brand owners)
- Mock data: MOCK_HUB_NOTIFICATIONS filtre par hubId
- Navigation: nouveau Stack.Screen "HubNotifications" dans App.js

## Feature 6: Clic sur news dans Home = voir l'integralite + lien + feedback
**Fichiers: HomeScreen.js, nouveau: NotificationDetailScreen.js**

### Ce qui change:
- Chaque card de notification dans Home est clickable (pas juste le bouton feedback)
- Au clic: navigation vers `NotificationDetail`
- Nouveau screen `NotificationDetailScreen.js`:
  - Header: hub icon + hub name + timestamp
  - Titre complet en grand
  - Message complet (texte integral)
  - Lien de redirection si disponible (TouchableOpacity avec Linking.openURL)
  - Stats: reactions, comments
  - Bouton "Send Feedback" (300 $SKR) en bas avec modal
  - Bouton "Share"
- Navigation: nouveau Stack.Screen "NotificationDetail" dans App.js

## Feature 7: Admin Stats avancees avec filtres de periodes
**Fichier: AdminScreen.js (section overview reecrite)**

### Ce qui change:
- Remplacer la section overview par un dashboard stats complet
- 3 onglets de segmentation: **Global** / **Users** / **Brands**
- Selecteur de periode: "7 days", "30 days", "90 days", "Custom"
  - Custom: 2 inputs date (from/to) avec DatePicker simple (TextInput format YYYY-MM-DD)
- **Global**: Total users, Active users, Total hubs, Revenue, Ads sold, Feedback count, DAO proposals, Growth %
- **Users**: New registrations, Active users, Avg score, Top tier distribution, Feedback sent, Subscriptions
- **Brands**: Active hubs, Revenue per hub, Ads purchased, Approval rate, Avg response time, Suspended count
- Chaque stat = card avec trend indicator (fleche up/down + % change)
- Mock data generee par periode selectionnee (different values per period)

---

## Ordre d'execution (sequentiel):
1. Feature 4 - Validation technique (petite, fondation pour les autres)
2. Feature 1 - Ad Moderation Admin
3. Feature 3 - Edit creative en cours de campagne
4. Feature 2 - Messagerie Admin <-> Marques
5. Feature 5 - MyHubs -> notifications du hub
6. Feature 6 - Detail notification + lien + feedback
7. Feature 7 - Admin stats avancees

## Fichiers a creer:
- `src/screens/AdminMessagesScreen.js`
- `src/screens/HubNotificationsScreen.js`
- `src/screens/NotificationDetailScreen.js`

## Fichiers a modifier:
- `App.js` (3 nouveaux Stack.Screen)
- `src/screens/AdminScreen.js` (ad moderation + messages link + stats refonte)
- `src/screens/AdSlotsScreen.js` (validation + edit creative + pending review flow)
- `src/screens/HomeScreen.js` (cards clickables -> detail)
- `src/screens/MyHubsScreen.js` (click -> HubNotifications)
- `src/screens/HubDashboardScreen.js` (lien messages admin)
- `src/config/constants.js` (nouveaux endpoints API)

## Design trends 2026 applicables:
L'article n'a pas pu etre lu entierement, mais les tendances 2026 courantes qu'on applique deja ou qu'on peut renforcer:
- **Glassmorphism/Glow effects** -> deja en place avec GlowCard + PulseOrb
- **Micro-animations** -> deja les animations de pulse, on peut ajouter des transitions de navigation
- **Dark mode first** -> deja notre base
- **Bento grid layout** -> applicable pour les stats admin (cards en grille)
- **Haptic feedback feel** -> elevation + shadows subtiles (deja fait)
