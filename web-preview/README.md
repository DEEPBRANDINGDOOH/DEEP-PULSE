# Aperçu visuel DEEP Pulse (navigateur)

Cette page permet de **voir et parcourir** tous les écrans de l'application sans émulateur Android ni téléphone.

## Comment l'ouvrir

1. **Double-cliquez** sur `index.html` dans le dossier `web-preview/`,  
   **ou**
2. Depuis le terminal :  
   `open web-preview/index.html` (macOS)  
   `start web-preview/index.html` (Windows)  
   `xdg-open web-preview/index.html` (Linux)  
   **ou**
3. Ouvrez votre navigateur → **Fichier → Ouvrir un fichier** → choisir `web-preview/index.html`.

## Fonctionnement

- **Onboarding** : 4 slides (défilement horizontal, boutons Skip / Next / Connect Wallet / Browse as Guest). En cliquant sur « Connect Wallet » ou « Browse as Guest », vous passez à l'app principale.
- **Barre d'onglets (bas)** : 6 onglets cliquables — **Home**, **Discover**, **My Hubs**, **DAO**, **Talent**, **Profile**.
- **Home** : fil d'actualités, bandeaux pub, cartes « Send Feedback ».
- **Discover** : recherche, hubs tendance, boutons Subscribe FREE.
- **My Hubs** : liste des abonnements, dernières notifs, View All / Unsubscribe.
- **DAO** : sélecteur de hub, onglets **Propose** / **Votes** / **Vault** (propositions, financement, coffre).
- **Talent** : onglets **Submit** / **Browse** / **Mine** (dépôt, parcourir talents, mes candidatures).
- **Profile** : wallet, balance, DEEP Score, statistiques, réglages, liens vers **Admin**, **Hub Dashboard**, **Ad Slots**, **Moderation**.
- **Écrans secondaires** (depuis Profile ou la barre au-dessus du téléphone) : **Admin**, **Hub Dashboard**, **Ad Slots**, **Moderation**, chacun avec un bouton « Back » pour revenir.

Les boutons au-dessus du téléphone permettent aussi de sauter directement à n'importe quel écran pour la démo.

## Note

C'est une **simulation** (HTML/CSS/JS + Tailwind) pour refléter le design et le parcours. L'app réelle tourne en React Native sur Android (Solana Mobile).
