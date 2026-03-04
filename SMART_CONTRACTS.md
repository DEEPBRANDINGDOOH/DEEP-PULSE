# DEEP Pulse — Smart Contracts Solana (Anchor)

> Architecture on-chain complète pour la plateforme DEEP Pulse.
> Programme monolithique Anchor déployé sur Solana, utilisant le token **$SKR** existant.

---

## Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Prérequis](#prérequis)
- [Structure du projet](#structure-du-projet)
- [Architecture du programme](#architecture-du-programme)
- [Token $SKR](#token-skr)
- [Comptes on-chain (State)](#comptes-on-chain-state)
- [Instructions (23)](#instructions-23)
- [Événements](#événements)
- [Codes d'erreur](#codes-derreur)
- [Sécurité](#sécurité)
- [Pricing & Économie](#pricing--économie)
- [Scoring on-chain](#scoring-on-chain)
- [Build & Déploiement](#build--déploiement)
- [Tests](#tests)
- [Intégration Frontend](#intégration-frontend)
- [Flux utilisateur](#flux-utilisateur)

---

## Vue d'ensemble

L'application DEEP Pulse est une **Web3 Brand Engagement Platform pour Solana Mobile**. Avant cette mise à jour, l'app était 100% frontend — les transactions étaient simulées via `SystemProgram.transfer` et les données stockées dans `AsyncStorage`.

Ce document couvre le **programme Anchor on-chain** qui remplace toute la logique simulée par de vraies transactions Solana :

- **Escrow pattern** pour les dépôts (feedback, talent, DAO proposals)
- **DAO Vault** avec contributions communautaires et split 95/5
- **Ad Slots** avec système de discount par durée
- **Scoring on-chain** intégré dans les instructions
- **Modération brand** avec approbation/rejet atomique

### Pourquoi un seul programme ?

| Avantage | Détail |
|----------|--------|
| Atomicité | Pas de CPI entre modules = transactions atomiques garanties |
| Simplicité | Un seul Program ID à gérer côté frontend |
| Déploiement | Une seule commande `anchor deploy` |
| Maintenance | ~21 instructions, taille modérée |

---

## Prérequis

```bash
# Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Solana CLI
sh -c "$(curl -sSfL https://release.anza.xyz/stable/install)"

# Anchor CLI
cargo install --git https://github.com/coral-xyz/anchor anchor-cli

# Vérification
anchor --version    # 0.30.1+
solana --version    # 1.18+
rustc --version     # 1.75+
```

---

## Structure du projet

```
deep-pulse-complete/
├── Anchor.toml                          # Config Anchor (cluster, wallet, scripts)
├── Cargo.toml                           # Workspace Rust
├── programs/deep-pulse/
│   ├── Cargo.toml                       # Dépendances (anchor-lang 0.30.1, anchor-spl)
│   └── src/
│       ├── lib.rs                       # declare_id!, #[program], 21 instructions
│       ├── constants.rs                 # Seeds PDA, pricing, scoring, limites
│       ├── errors.rs                    # 33 codes d'erreur
│       ├── events.rs                    # 18 événements on-chain
│       ├── instructions/
│       │   ├── mod.rs
│       │   ├── admin.rs                 # initialize_platform, update_config
│       │   ├── hub.rs                   # create, renew, subscribe, unsubscribe, verify, activate
│       │   ├── deposit.rs               # create_deposit, approve (feedback/dao/talent), reject
│       │   ├── dao_vault.rs             # contribute, complete, cancel, claim_refund
│       │   ├── ad_slot.rs               # purchase, update, expire
│       │   └── scoring.rs               # init_user_score
│       └── state/
│           ├── mod.rs
│           ├── platform.rs              # PlatformConfig (singleton)
│           ├── hub.rs                   # Hub, HubSubscription, HubCategory
│           ├── deposit.rs               # Deposit, DepositType, DepositStatus
│           ├── dao_vault.rs             # DaoVault, VaultContribution, VaultStatus
│           ├── ad_slot.rs               # AdSlot, SlotType, calculate_ad_discount()
│           └── user_score.rs            # UserScore, ActionType
├── tests/
│   └── deep-pulse.ts                   # Suite de tests TypeScript complète
├── src/services/
│   ├── programService.js               # Client SDK (PDA helpers + MWA wrappers)
│   └── ModerationService.js            # Service de modération (appels on-chain)
└── tsconfig.json
```

---

## Architecture du programme

```
┌──────────────────────────────────────────────────────┐
│                  DEEP PULSE PROGRAM                   │
│           Program ID: (post-deployment)               │
├──────────────┬──────────────┬────────────────────────┤
│   Admin (2)  │   Hub (6)    │    Deposit/Escrow (5)  │
│              │              │                         │
│ • init       │ • create     │ • create_deposit        │
│ • update     │ • renew      │ • approve_feedback      │
│              │ • subscribe  │ • approve_dao_proposal   │
│              │ • unsub      │ • approve_talent         │
│              │ • verify     │ • reject_deposit         │
│              │ • activate   │                         │
├──────────────┼──────────────┼────────────────────────┤
│ DAO Vault(4) │ Ad Slots (3) │   Scoring (1)          │
│              │              │                         │
│ • contribute │ • purchase   │ • init_user_score       │
│ • complete   │ • update     │ (+ hooks dans les       │
│ • cancel     │ • expire     │  autres instructions)   │
│ • refund     │              │                         │
└──────────────┴──────────────┴────────────────────────┘
```

---

## Token $SKR

Le token **$SKR** est un **token SPL existant** sur Solana. Il n'est **pas créé** par le programme.

| Propriété | Valeur |
|-----------|--------|
| **Mint Address** | `SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3` |
| **Standard** | SPL Token |
| **Decimals** | 6 |
| **Plus petite unité** | 1 = 0.000001 $SKR |

Le mint est passé en paramètre lors de `initialize_platform` et stocké dans `PlatformConfig.skr_mint`. Toutes les instructions vérifient que les token accounts utilisent ce mint via des contraintes `@ DeepPulseError::InvalidSkrMint`.

---

## Comptes on-chain (State)

### PlatformConfig (singleton)

| Seeds | `[b"platform_config"]` |
|-------|------------------------|
| Taille | 165 bytes (~0.002 SOL rent) |

```
admin: Pubkey                    // Administrateur plateforme
treasury: Pubkey                 // PDA Treasury (reçoit les fees)
skr_mint: Pubkey                 // Mint $SKR existant
hub_subscription_price: u64      // 2,000 $SKR (défaut)
feedback_deposit: u64            // 300 $SKR
dao_proposal_deposit: u64        // 100 $SKR
talent_deposit: u64              // 50 $SKR
top_ad_price_per_week: u64       // 1,500 $SKR
bottom_ad_price_per_week: u64    // 800 $SKR
dao_brand_share_bps: u16         // 9500 (95%)
dao_platform_share_bps: u16      // 500 (5%)
min_vault_contribution: u64      // 10 $SKR
bump: u8
```

### Hub

| Seeds | `[b"hub", creator, hub_index(u32)]` |
|-------|--------------------------------------|
| Taille | 393 bytes (~0.004 SOL rent) |

```
creator: Pubkey                  // Brand wallet
name: String (max 64)
description: String (max 256)
category: HubCategory            // DeFi, NFT, Gaming, Social, Infrastructure, DAO, DePIN, Other
subscriber_count: u32
is_verified: bool                // Admin only
is_active: bool
subscription_paid_until: i64     // Expiration de l'abonnement
created_at: i64
hub_index: u32
bump: u8
```

### HubSubscription

| Seeds | `[b"subscription", user, hub_pda]` |
|-------|-------------------------------------|
| Taille | 81 bytes (~0.001 SOL rent) |

```
user: Pubkey
hub: Pubkey
subscribed_at: i64
bump: u8
```

### Deposit (Escrow)

| Seeds | `[b"deposit", depositor, deposit_index(u32)]` |
|-------|------------------------------------------------|
| Taille | 167 bytes (~0.002 SOL rent) |

```
depositor: Pubkey
hub: Pubkey
deposit_type: DepositType        // Feedback (300), DaoProposal (100), Talent (50)
amount: u64
status: DepositStatus            // Pending → Approved | Rejected
content_hash: [u8; 32]           // SHA-256 du contenu soumis
created_at: i64
resolved_at: i64
resolver: Pubkey                 // Brand qui a modéré
deposit_index: u32
bump: u8
```

**Escrow Token Account** : `[b"escrow", deposit_pda]` — fermé après résolution (rent récupéré).

### DaoVault

| Seeds | `[b"vault", hub_pda, vault_index(u32)]` |
|-------|------------------------------------------|
| Taille | 417 bytes (~0.004 SOL rent) |

```
proposal_deposit: Pubkey         // Référence au dépôt qui a créé ce vault
hub: Pubkey
creator: Pubkey                  // User qui a proposé le boost
brand: Pubkey                    // Brand wallet (reçoit 95%)
title: String (max 64)
description: String (max 256)
target_amount: u64
current_amount: u64
contributor_count: u32
status: VaultStatus              // Open → Funded | Expired | Cancelled → Refunded
created_at: i64
funded_at: i64
expires_at: i64
vault_index: u32
bump: u8
```

### VaultContribution

| Seeds | `[b"contribution", vault_pda, contributor]` |
|-------|----------------------------------------------|
| Taille | 90 bytes (~0.002 SOL rent) |

```
contributor: Pubkey
vault: Pubkey
amount: u64
contributed_at: i64
refunded: bool
bump: u8
```

### AdSlot

| Seeds | `[b"ad_slot", hub_pda, slot_type(u8), slot_index(u8)]` |
|-------|---------------------------------------------------------|
| Taille | 172 bytes (~0.002 SOL rent) |

```
advertiser: Pubkey
hub: Pubkey
slot_type: SlotType              // Top | Bottom
image_url_hash: [u8; 32]        // SHA-256 de l'URL image (stockée off-chain)
landing_url_hash: [u8; 32]      // SHA-256 de l'URL landing
amount_paid: u64
start_time: i64
end_time: i64
is_active: bool
slot_index: u8
created_at: i64
bump: u8
```

### UserScore

| Seeds | `[b"user_score", user]` |
|-------|--------------------------|
| Taille | 66 bytes (~0.001 SOL rent) |

```
user: Pubkey
total_score: u32
dao_boost_count: u16
talent_submit_count: u16
feedback_count: u16
subscribe_count: u16
notification_read_count: u16     // MAJ off-chain
ad_click_count: u16              // MAJ off-chain
last_activity: i64
action_types_used: u8            // Bitmask pour bonus diversité
bump: u8
```

---

## Instructions (20)

### Admin (2)

| Instruction | Description | Signataire |
|-------------|-------------|------------|
| `initialize_platform` | Crée PlatformConfig + Treasury PDA. Accepte le mint $SKR existant. Tous les prix sont configurables (défauts si `None`). | Admin |
| `update_platform_config` | Modifie les paramètres (prix, splits). Valide que `brand_bps + platform_bps == 10000`. | Admin |

### Hub (6)

| Instruction | Description | Coût $SKR | Signataire |
|-------------|-------------|-----------|------------|
| `create_hub` | Crée un hub, transfère 2000 $SKR vers treasury. Abonnement valable 30 jours. | 2,000 | Brand |
| `renew_hub_subscription` | Prolonge de 30 jours (depuis la date d'expiration actuelle ou maintenant). | 2,000 | Brand |
| `subscribe_to_hub` | Crée un PDA HubSubscription. Incrémente `subscriber_count`. Met à jour le score. | Rent seul | User |
| `unsubscribe_from_hub` | Ferme le PDA (rent retourné). Décrémente `subscriber_count`. | 0 (rent récupéré) | User |
| `set_hub_verified` | Active/désactive le badge vérifié. | 0 | Admin |
| `set_hub_active` | Active/désactive le hub. | 0 | Admin |

### Deposit / Escrow (5)

| Instruction | Description | Coût $SKR | Signataire |
|-------------|-------------|-----------|------------|
| `create_deposit` | Verrouille les $SKR dans un escrow PDA. Type : Feedback (300), DaoProposal (100), Talent (50). | Variable | User |
| `approve_feedback` | Rembourse l'escrow au déposant. Ferme le compte escrow. | 0 | Brand |
| `approve_dao_proposal` | Rembourse + crée un DaoVault avec les paramètres fournis. | 0 | Brand |
| `approve_talent` | Rembourse l'escrow au déposant. Ferme le compte escrow. | 0 | Brand |
| `reject_deposit` | Envoie l'escrow vers le treasury. Ferme le compte escrow. | 0 | Brand |

### DAO Vault (4)

| Instruction | Description | Signataire |
|-------------|-------------|------------|
| `contribute_to_vault` | Transfère $SKR vers le vault. Vérifie min contribution, expiration, et target non atteint. | User |
| `complete_vault` | Distribue 95% au brand + 5% au treasury. Permissionless crank (n'importe qui peut appeler). | Quiconque |
| `cancel_vault` | Change le statut en Cancelled. | Brand ou Admin |
| `claim_vault_refund` | Rembourse la part proportionnelle au contributeur. | Contributeur |

### Ad Slots (3)

| Instruction | Description | Signataire |
|-------------|-------------|------------|
| `purchase_ad_slot` | Achète un emplacement pub avec discount basé sur la durée. | Advertiser |
| `update_ad_slot` | Met à jour les hash d'image/URL (creative change). | Advertiser |
| `expire_ad_slot` | Désactive le slot après `end_time`. Permissionless crank. | Quiconque |

**Grille de discount ads :**

| Durée | Discount |
|-------|----------|
| 52+ semaines | 40% |
| 26+ semaines | 30% |
| 12+ semaines | 20% |
| 4+ semaines | 10% |
| < 4 semaines | 0% |

### Scoring (1)

| Instruction | Description | Signataire |
|-------------|-------------|------------|
| `init_user_score` | Crée le compte UserScore pour un utilisateur. | User |

Le scoring est **intégré** dans les autres instructions via des hooks :

| Action | Instruction | Points |
|--------|-------------|--------|
| S'abonner à un hub | `subscribe_to_hub` | +10 |
| Soumettre un feedback | `create_deposit(Feedback)` | +25 |
| Soumettre un talent | `create_deposit(Talent)` | +30 |
| Contribuer à un vault | `contribute_to_vault` | +50 |

Les actions `notification_read` et `ad_click` restent off-chain (trop fréquentes pour le coût de transaction).

---

## Événements

Tous les événements sont émis via `emit!()` pour permettre l'indexing côté frontend.

| Catégorie | Événements |
|-----------|-----------|
| **Platform** | `PlatformInitialized`, `PlatformConfigUpdated` |
| **Hub** | `HubCreated`, `HubSubscriptionRenewed`, `UserSubscribed`, `UserUnsubscribed`, `HubVerifiedChanged`, `HubActiveChanged` |
| **Deposit** | `DepositCreated`, `DepositApproved`, `DepositRejected` |
| **DAO Vault** | `VaultCreated`, `VaultContributed`, `VaultCompleted`, `VaultCancelled`, `VaultRefunded` |
| **Ad Slot** | `AdSlotPurchased`, `AdSlotUpdated`, `AdSlotExpired` |
| **Scoring** | `ActionRecorded` |

---

## Codes d'erreur

| Code | Nom | Description |
|------|-----|-------------|
| 6000 | `UnauthorizedAdmin` | Seul l'admin peut exécuter cette action |
| 6001 | `InvalidShareConfig` | brand_bps + platform_bps doit = 10000 |
| 6002 | `HubNameTooLong` | Nom du hub > 64 caractères |
| 6003 | `HubDescriptionTooLong` | Description > 256 caractères |
| 6004 | `HubSubscriptionExpired` | Abonnement hub expiré |
| 6005 | `HubNotActive` | Hub désactivé |
| 6006 | `UnauthorizedHubCreator` | Seul le créateur du hub peut agir |
| 6007 | `AlreadySubscribed` | Déjà abonné à ce hub |
| 6008 | `InvalidDepositType` | Type de dépôt invalide |
| 6009 | `DepositNotPending` | Dépôt déjà traité |
| 6010 | `UnauthorizedModerator` | Seul le brand (créateur du hub) peut modérer |
| 6011 | `DepositTypeMismatch` | Mauvaise instruction pour ce type de dépôt |
| 6012 | `VaultTitleTooLong` | Titre du vault > 64 caractères |
| 6013 | `VaultDescriptionTooLong` | Description vault > 256 caractères |
| 6014 | `VaultNotOpen` | Vault pas ouvert aux contributions |
| 6015 | `VaultExpired` | Vault expiré |
| 6016 | `ContributionTooSmall` | Contribution < minimum (10 $SKR) |
| 6017 | `VaultTargetNotReached` | Target non atteint (complete_vault) |
| 6018 | `VaultAlreadyFunded` | Target déjà atteint |
| 6019 | `UnauthorizedVaultCancel` | Seul le brand/admin peut annuler |
| 6020 | `VaultNotRefundable` | Vault ni annulé ni expiré |
| 6021 | `AlreadyRefunded` | Contribution déjà remboursée |
| 6022 | `NoContribution` | Aucune contribution trouvée |
| 6023 | `InvalidSlotType` | Type de slot publicitaire invalide |
| 6024 | `InvalidAdDuration` | Durée < 1 semaine |
| 6025 | `AdSlotStillActive` | Slot encore actif |
| 6026 | `UnauthorizedAdvertiser` | Seul l'annonceur peut modifier |
| 6027 | `AdSlotNotExpired` | Slot pas encore expiré |
| 6028 | `MathOverflow` | Dépassement arithmétique |
| 6029 | `InvalidSkrMint` | Mauvais mint $SKR |
| 6030 | `InsufficientBalance` | Solde $SKR insuffisant |
| 6031 | `ScoreOverflow` | Dépassement du score |

---

## Sécurité

Conformément aux bonnes pratiques de [`solana-foundation/solana-dev-skill`](https://github.com/solana-foundation/solana-dev-skill) :

| Mesure | Implémentation |
|--------|----------------|
| **Type safety** | `Account<'info, T>` partout, jamais `UncheckedAccount` |
| **Authorization** | `has_one = creator` sur les actions brand-only |
| **Signer checks** | `Signer<'info>` sur chaque instruction modifiant un état |
| **PDA isolation** | Seeds incluent toujours un identifiant user-specific |
| **Checked math** | `checked_mul`, `checked_div`, `checked_sub` systématiques |
| **No init_if_needed** | Sauf pour `VaultContribution` (contributions multiples) |
| **Account closure** | `close = destination` avec rent retourné au bon destinataire |
| **Discriminators** | Anchor discriminators par défaut (8 bytes) |
| **Config validation** | `dao_brand_share_bps + dao_platform_share_bps == 10000` |
| **Mint validation** | Chaque token account vérifie `mint == platform_config.skr_mint` |

---

## Pricing & Économie

### Revenus plateforme

| Source | Montant | Quand |
|--------|---------|-------|
| Création de hub | 2,000 $SKR | Brand crée un hub |
| Renouvellement hub | 2,000 $SKR/mois | Brand renouvelle |
| Feedback rejeté | 300 $SKR | Brand rejette un feedback |
| Proposal rejeté | 100 $SKR | Brand rejette une proposal |
| Talent rejeté | 50 $SKR | Brand rejette un talent |
| Fee DAO Vault | 5% du total | Vault atteint son objectif |
| Achat Ad Slot | Variable | Annonceur achète un slot |

### Flux des tokens

```
User ──── create_deposit ────→ [Escrow PDA]
                                    │
                    ┌───────────────┤
                    │               │
              approve           reject
                    │               │
                    ▼               ▼
               [User refund]   [Treasury]
```

```
Users ──── contribute ────→ [Vault Token PDA]
                                    │
                            complete_vault
                                    │
                    ┌───────────────┤
                    │               │
                 95% brand       5% treasury
                    │               │
                    ▼               ▼
             [Brand ATA]     [Treasury ATA]
```

---

## Scoring on-chain

Le scoring est un système hybride :

**On-chain** (automatique via hooks dans les instructions) :
- `subscribe_to_hub` → +10 points
- `create_deposit(Feedback)` → +25 points
- `create_deposit(Talent)` → +30 points
- `contribute_to_vault` → +50 points

**Off-chain** (trop fréquent pour le coût de transaction) :
- Lecture de notification
- Clic sur pub

Le champ `action_types_used` est un **bitmask** pour tracker la diversité des actions (bonus multiplicateur côté frontend).

---

## Build & Déploiement

### 1. Build

```bash
cd deep-pulse-complete
anchor build
```

### 2. Récupérer le Program ID

```bash
solana address -k target/deploy/deep_pulse-keypair.json
```

### 3. Mettre à jour le Program ID

Remplacer `3N5coxatEEbdLuTKovXdzrJX9E7ZAD6t2bWuz7BgGR63` par l'ID réel dans :
- `programs/deep-pulse/src/lib.rs` → `declare_id!("...")`
- `Anchor.toml` → `[programs.localnet]` et `[programs.devnet]`
- `src/config/constants.js` → `SOLANA_CONFIG.PROGRAM_ID`
- `src/services/programService.js` → `PROGRAM_ID`

### 4. Re-build avec le bon ID

```bash
anchor build
```

### 5. Déployer sur devnet

```bash
solana config set --url devnet
anchor deploy --provider.cluster devnet
```

### 6. Initialiser la plateforme

Après déploiement, appeler `initialize_platform` avec le mint $SKR existant :

```bash
# Via le test suite ou un script dédié
anchor test --skip-local-validator
```

---

## Tests

La suite de tests complète se trouve dans `tests/deep-pulse.ts`.

### Exécution

```bash
# Tests locaux (lance un validateur local)
anchor test

# Tests sur devnet (validateur externe)
anchor test --provider.cluster devnet --skip-local-validator
```

### Groupes de tests

| Groupe | Tests |
|--------|-------|
| **Admin** | Initialize platform, Update config, Reject non-admin |
| **Hub** | Create hub, Subscribe, Unsubscribe, Set verified, Renew subscription |
| **Deposit** | Create feedback deposit, Approve feedback (refund), Reject deposit (treasury) |
| **DAO Vault** | Approve DAO proposal (create vault), Contribute, Cancel vault, Claim refund |
| **Ad Slots** | Purchase with discount, Update creative |
| **Scoring** | Init user score |

### Setup des tests

Le setup crée automatiquement :
1. Wallets de test : admin, brand, user1, user2, advertiser
2. Mint $SKR simulé (pour tests locaux)
3. Token accounts pour tous les wallets
4. Airdrop de SOL + mint de $SKR

---

## Intégration Frontend

### Nouveaux fichiers

| Fichier | Rôle |
|---------|------|
| `src/services/programService.js` | Client SDK — PDA derivation + MWA transaction wrappers |
| `src/services/ModerationService.js` | Service de modération — appels on-chain (remplace les mocks) |

### Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `package.json` | Ajout `@coral-xyz/anchor` + `@solana/spl-token` |
| `src/config/constants.js` | `PROGRAM_ID` + `SKR_MINT` remplacent les anciens placeholders |

### Utilisation du SDK

```javascript
import { programService } from './services/programService';

// Lire les hubs
const hubs = await programService.fetchAllHubs();

// S'abonner à un hub
await programService.subscribeToHub(hubPda);

// Créer un dépôt feedback
const contentHash = await programService.hashContent("Mon feedback...");
await programService.createDeposit(hubPda, 'feedback', contentHash, 0);

// Contribuer à un vault DAO
await programService.contributeToVault(vaultPda, 500_000_000); // 500 $SKR
```

---

## Flux utilisateur

### Flux Feedback

```
1. User ouvre un hub
2. User soumet un feedback → create_deposit(Feedback) → 300 $SKR en escrow
3. Brand voit le feedback dans l'onglet modération
4a. Brand approuve → approve_feedback() → 300 $SKR retournés au user
4b. Brand rejette → reject_deposit() → 300 $SKR vers treasury
```

### Flux DAO Boost

```
1. User propose un boost → create_deposit(DaoProposal) → 100 $SKR en escrow
2. Brand approuve → approve_dao_proposal() → 100 $SKR retournés + DaoVault créé
3. Communauté contribue → contribute_to_vault() → $SKR dans le vault
4a. Target atteint → complete_vault() → 95% brand, 5% treasury
4b. Vault expiré/annulé → cancel_vault() + claim_vault_refund() par chaque contributeur
```

### Flux Talent

```
1. User soumet son talent → create_deposit(Talent) → 50 $SKR en escrow
2. Brand examine
3a. Brand retient → approve_talent() → 50 $SKR retournés
3b. Brand ne retient pas → reject_deposit() → 50 $SKR vers treasury
```

### Flux Ad Slot

```
1. Annonceur choisit un hub + type de slot (Top/Bottom)
2. Annonceur choisit la durée → discount calculé automatiquement
3. purchase_ad_slot() → $SKR vers treasury
4. Annonceur peut modifier le creative → update_ad_slot()
5. Après expiration → expire_ad_slot() (crank permissionless)
```

---

## Dépendances

### Programme Rust

| Package | Version | Usage |
|---------|---------|-------|
| `anchor-lang` | 0.30.1 | Framework Solana |
| `anchor-spl` | 0.30.1 | Token transfers SPL |

### Frontend (nouvelles)

| Package | Version | Usage |
|---------|---------|-------|
| `@coral-xyz/anchor` | ^0.30.1 | Client Anchor (IDL, instructions) |
| `@solana/spl-token` | ^0.4.6 | ATA creation, token utils |

---

*Dernière mise à jour : Février 2025*
*Built with Anchor 0.30.1 for Solana Mobile (MWA 2.0)*
