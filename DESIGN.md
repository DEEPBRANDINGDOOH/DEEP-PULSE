# Guide design – DEEP Pulse

Recommandations pour améliorer le design de l’app (aligné avec la prévisualisation web).

---

## 1. Typographie

- **Police** : [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans) (ou en React Native : charger la font puis l’utiliser partout).
- **Hiérarchie** :
  - Titres d’écran : **800** (extra bold), `letterSpacing: -0.5`.
  - Sous-titres / sections : **700**, taille adaptée.
  - Corps : **400–500**, `lineHeight` augmenté (1.4–1.5) pour le texte long.
- **Labels de section** (ex. « Latest », « Trending ») : **700**, `letterSpacing: 0.08`, `textTransform: 'uppercase'`, couleur secondaire, petite taille (11–12px).

---

## 2. Couleurs

| Usage | Avant | Recommandation |
|--------|--------|-----------------|
| Fond principal | `#0a0a0a` | `#0c0c0e` (légèrement moins plat) |
| Cartes | `#1a1a1a` | Dégradé ou `#16161a` + bordure `#2a2a30` |
| Texte secondaire | `#a0a0a0` | `#9898a0` (labels), `#6b6b73` (muted) |
| Bordures | `#333` | `#2a2a30` (plus discret) |
| Primary (boutons) | `#FF9F66` | Garder + **dégradé** `#FF9F66` → `#e88b52` pour les CTA |
| Success | `#4CAF50` | `#22c55e` (plus vif) |
| Error | `#f44336` | `#ef4444` |

---

## 3. Cartes

- **Background** : léger dégradé vertical (`#18181c` → `#141418`) ou fond uni `#16161a`.
- **Bordure** : 1px `#2a2a30` (ou `rgba(255,255,255,0.06)`).
- **Ombre** : `shadowColor: '#000'`, `shadowOffset: { width: 0, height: 4 }`, `shadowOpacity: 0.25`, `shadowRadius: 12`, `elevation: 4`.
- **Border radius** : 16–20px (ex. `borderRadius: 20`).
- **Padding** : 16–20px (p. ex. `padding: 20`).

---

## 4. Boutons principaux (CTA)

- **Background** : dégradé `#FF9F66` → `#e88b52`.
- **Ombre** : teintée primary, ex. `shadowColor: '#FF9F66'`, `shadowOpacity: 0.4`, `shadowRadius: 12`.
- **Border radius** : 14–16px.
- **Texte** : blanc, **700**, taille lisible (15–16px).
- **État pressé** : légère réduction de scale (ex. `transform: [{ scale: 0.98 }]`) ou légère baisse d’opacité.

---

## 5. Badges (NEW, PENDING, etc.)

- **Style** : dégradé primary pour les badges « positifs » (NEW, FUNDING), fond + texte contrasté pour les statuts.
- **Forme** : `borderRadius` très grand (pill), `paddingHorizontal: 8`, `paddingVertical: 2`.
- **Typo** : **800**, `letterSpacing: 0.04`, petite taille (10px).

---

## 6. Tab bar (navigation bas)

- **Fond** : `rgba(10,10,13,0.95)` + `BlurView` si disponible (effet glass).
- **Bordure haute** : 1px `rgba(255,255,255,0.06)`.
- **Onglet actif** : couleur primary + fond `rgba(255,159,102,0.1)` (pill).
- **Icônes** : taille ~22–24px, opacité plus forte sur l’onglet actif.
- **Labels** : 10px, **600**, couleur secondaire / primary pour l’actif.

---

## 7. Onboarding

- **Cercles d’icônes** : fond coloré à ~20% d’opacité + bordure ou ombre légère (`shadowRadius: 16`, `shadowOpacity: 0.2`) pour donner du relief.
- **Pagination (points)** : point actif en forme de **pill** (largeur 24px, dégradé primary), inactifs en rond 6px, couleur `rgba(255,255,255,0.15)`.
- **Espacement** : plus d’air (padding 48–52px vertical, texte centré avec `maxWidth` sur la description).
- **Boutons** : même style CTA que ci‑dessus (dégradé + ombre).

---

## 8. Champs de formulaire (inputs)

- **Fond** : `#222228` (ou équivalent `background-secondary`).
- **Bordure** : `#2a2a30`.
- **Focus** : bordure ou `shadow` en primary (ex. `borderColor: '#FF9F66'`, `shadowColor: '#FF9F66'`, `shadowOpacity: 0.2`).
- **Placeholder** : `#5a5a62` ou `#6b6b73`.
- **Border radius** : 12–14px.

---

## 9. Icônes de hubs (avatars / pastilles)

- **Style** : fond en dégradé primary léger (`rgba(255,159,102,0.18)` → `rgba(255,159,102,0.08)`), bordure `rgba(255,159,102,0.2)`.
- **Forme** : `borderRadius: 14` (arrondi mais pas cercle) pour les initiales, ou cercle pour les emojis.
- **Taille** : 48px pour les listes, cohérent partout.

---

## 10. Bandeaux pub (ads)

- **Top** : dégradé primary (comme les CTA) + ombre légère primary.
- **Bottom** : dégradé violet (`#a855f7` → `#7c3aed`) + ombre légère.
- **Border radius** : 14–16px.
- **Typo** : **700–800**, légère `letterSpacing`.

---

## 11. Icônes (pro, pas d'emoji)

Utiliser une librairie vectorielle (Lucide, Phosphor) partout à la place des emojis. Tailles : 20–24px tab bar, 16–20px inline, 44–48px onboarding. Noms utiles : home, search, layout-grid, rocket, briefcase, user, bell, wallet, message-circle, shield-check, megaphone, send, copy, trophy, moon, bar-chart-2, chevron-left, chevron-right.

---

## Application dans le projet React Native

1. **tailwind.config.js** : étendre `theme.extend` avec les nouvelles couleurs (`primary-dark`, `background-card-hover`, `text-muted`, `border-soft`), `fontFamily` (Plus Jakarta Sans), et éventuellement des `boxShadow` si tu utilises des composants web ou une lib qui les supporte.
2. **Polices** : ajouter Plus Jakarta Sans (ex. via `react-native.config.js` + `linking` ou Expo `useFonts`), puis l’utiliser comme `fontFamily` par défaut.
3. **Composants** : créer ou mettre à jour des composants réutilisables (ex. `Card`, `PrimaryButton`, `Badge`, `SectionLabel`) qui appliquent ces règles.
4. **Écrans** : appliquer progressivement (onboarding, Home, cartes, tab bar, formulaires) en reprenant les tokens ci‑dessus.

La prévisualisation dans `web-preview/index.html` reflète déjà ces choix ; tu peux t’en servir de référence visuelle en parallèle du guide.
