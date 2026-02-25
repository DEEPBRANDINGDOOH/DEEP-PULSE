/**
 * ============================================
 * DEEP Pulse — Devnet / Localnet Initialization Script
 * ============================================
 *
 * Run AFTER deploying the program (.so).
 * This script:
 *   1. Creates a test $SKR mint (localnet) or uses existing (devnet)
 *   2. Calls initialize_platform with DEEP Pulse custom pricing
 *   3. Verifies PlatformConfig on-chain
 *   4. Initializes a user score for the admin wallet
 *   5. Creates a test hub ("Solana Gaming")
 *   6. Subscribes admin to the hub
 *   7. Prints a full summary
 *
 * Usage (localnet):
 *   ANCHOR_PROVIDER_URL=http://localhost:8899 ANCHOR_WALLET=~/.config/solana/id.json \
 *     npx ts-mocha -p ./tsconfig.json -t 120000 scripts/init-devnet.ts
 *
 * Usage (devnet):
 *   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com ANCHOR_WALLET=~/.config/solana/id.json \
 *     npx ts-mocha -p ./tsconfig.json -t 120000 scripts/init-devnet.ts
 *
 * ============================================
 */

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount as createTokenAccount,
  mintTo,
} from "@solana/spl-token";
import { assert } from "chai";

// Load IDL directly (avoids needing generated types)
const idl = require("../target/idl/deep_pulse.json");

// ============================================
// CONFIGURATION
// ============================================

const PROGRAM_ID = new PublicKey("33vWX6efKQSZ98dk3bnbHUjEYhB7LyvbH4ndpKjC6iY4");

// $SKR Token — On devnet/mainnet, use existing mint. On localnet, we create one.
const REAL_SKR_MINT = new PublicKey("SKRbvo6Gf7GondiT3BbTfuRDPqLWei4j2Qy2NPGZhW3");

const SKR_DECIMALS = 6;
const MULTIPLIER = Math.pow(10, SKR_DECIMALS);

// ============================================
// DEEP PULSE CUSTOM PRICING (with 6 decimals)
// ============================================

const PRICING = {
  hubSubscriptionPrice:  new anchor.BN(2000 * MULTIPLIER),  // 2,000 $SKR/month
  feedbackDeposit:       new anchor.BN(300  * MULTIPLIER),   // 300 $SKR (Rust default = 400)
  daoProposalDeposit:    new anchor.BN(100  * MULTIPLIER),   // 100 $SKR (same as Rust)
  talentDeposit:         new anchor.BN(50   * MULTIPLIER),   // 50 $SKR  (same as Rust)
  topAdPricePerWeek:     new anchor.BN(1500 * MULTIPLIER),   // 1,500 $SKR (Rust default = 500)
  bottomAdPricePerWeek:  new anchor.BN(800  * MULTIPLIER),   // 800 $SKR   (Rust default = 250)
  daoBrandShareBps:      9500,                               // 95% to brand
  daoPlatformShareBps:   500,                                // 5% to platform
  minVaultContribution:  new anchor.BN(10 * MULTIPLIER),     // 10 $SKR minimum
};

// ============================================
// TEST SUITE — INITIALIZATION
// ============================================

describe("DEEP Pulse — Platform Initialization", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Use IDL directly with Program constructor — no generated types needed
  const program = new Program(idl, provider) as Program<any>;
  const admin = (provider.wallet as any).payer as Keypair;

  let skrMint: PublicKey;
  let adminTokenAccount: PublicKey;
  let treasuryTokenAccountPk: PublicKey;

  // PDAs
  let platformConfigPda: PublicKey;
  let treasuryPda: PublicKey;
  let userScorePda: PublicKey;
  let hubPda: PublicKey;

  const hubIndex = 0;
  const isLocalnet = provider.connection.rpcEndpoint.includes("localhost") ||
                     provider.connection.rpcEndpoint.includes("127.0.0.1");

  before(async () => {
    console.log("");
    console.log("🔗 ═══════════════════════════════════════════");
    console.log("   DEEP Pulse — Platform Initialization");
    console.log("═══════════════════════════════════════════════");
    console.log("");
    console.log(`📡 Network:     ${isLocalnet ? "localnet" : "devnet"}`);
    console.log(`👛 Admin:       ${admin.publicKey.toString()}`);
    console.log(`🎯 Program ID:  ${PROGRAM_ID.toString()}`);

    // Check balance
    const balance = await provider.connection.getBalance(admin.publicKey);
    console.log(`💰 Balance:     ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
    console.log("");

    // Derive PDAs
    [platformConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("platform_config")],
      program.programId
    );
    [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );
    [userScorePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("user_score"), admin.publicKey.toBuffer()],
      program.programId
    );

    const indexBuffer = Buffer.alloc(4);
    indexBuffer.writeUInt32LE(hubIndex);
    [hubPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("hub"), admin.publicKey.toBuffer(), indexBuffer],
      program.programId
    );

    // Create test $SKR mint on localnet, or use existing on devnet
    if (isLocalnet) {
      console.log("🪙  Creating test $SKR mint (localnet)...");
      skrMint = await createMint(
        provider.connection,
        admin,
        admin.publicKey,
        null,
        SKR_DECIMALS
      );
      console.log(`   Mint: ${skrMint.toString()}`);

      // Create admin token account & mint 1M $SKR
      adminTokenAccount = await createTokenAccount(
        provider.connection,
        admin,
        skrMint,
        admin.publicKey
      );
      await mintTo(
        provider.connection,
        admin,
        skrMint,
        adminTokenAccount,
        admin,
        1_000_000 * MULTIPLIER
      );
      console.log(`   ✅ Minted 1,000,000 test $SKR to admin`);
      console.log("");
    } else {
      skrMint = REAL_SKR_MINT;
      console.log(`💎 $SKR Mint:   ${skrMint.toString()} (existing)`);
      console.log("");
    }
  });

  // ============================================
  // STEP 1: Initialize Platform
  // ============================================

  it("Step 1: Initialize Platform with custom pricing", async () => {
    console.log("");
    console.log("   Custom pricing (vs Rust defaults):");
    console.log("     Hub Subscription:  2,000 $SKR/month (same)");
    console.log("     Feedback Deposit:  300 $SKR        (Rust: 400)");
    console.log("     DAO Proposal:      100 $SKR        (same)");
    console.log("     Talent Deposit:    50 $SKR         (same)");
    console.log("     Top Ad/week:       1,500 $SKR      (Rust: 500)");
    console.log("     Bottom Ad/week:    800 $SKR        (Rust: 250)");
    console.log("     DAO Brand Share:   95%");
    console.log("     DAO Platform:      5%");
    console.log("     Min Vault:         10 $SKR");
    console.log("");

    // Check if already initialized
    try {
      const existing = await program.account.platformConfig.fetch(platformConfigPda);
      console.log("   ⚠️  Platform already initialized, skipping.");
      console.log(`   Admin: ${(existing as any).admin.toString()}`);
      return;
    } catch {
      // Not initialized — proceed
    }

    // Treasury token account keypair (init creates it)
    const treasuryTokenAccountKp = Keypair.generate();

    const tx = await program.methods
      .initializePlatform(
        PRICING.hubSubscriptionPrice,
        PRICING.feedbackDeposit,
        PRICING.daoProposalDeposit,
        PRICING.talentDeposit,
        PRICING.topAdPricePerWeek,
        PRICING.bottomAdPricePerWeek,
        PRICING.daoBrandShareBps,
        PRICING.daoPlatformShareBps,
        PRICING.minVaultContribution,
      )
      .accounts({
        admin: admin.publicKey,
        platformConfig: platformConfigPda,
        treasury: treasuryPda,
        skrMint: skrMint,
        treasuryTokenAccount: treasuryTokenAccountKp.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([treasuryTokenAccountKp])
      .rpc();

    treasuryTokenAccountPk = treasuryTokenAccountKp.publicKey;

    console.log(`   ✅ Platform initialized!`);
    console.log(`   Treasury Token Account: ${treasuryTokenAccountPk.toString()}`);
    console.log(`   Tx: ${tx}`);
    console.log("");
  });

  // ============================================
  // STEP 2: Verify Platform Config
  // ============================================

  it("Step 2: Verify PlatformConfig on-chain", async () => {
    const config: any = await program.account.platformConfig.fetch(platformConfigPda);

    console.log("");
    console.log("   ┌─────────────────────────────────────────────┐");
    console.log("   │         PlatformConfig On-Chain              │");
    console.log("   ├─────────────────────────────────────────────┤");
    console.log(`   │ Admin:            ${config.admin.toString().slice(0, 22)}...│`);
    console.log(`   │ $SKR Mint:        ${config.skrMint.toString().slice(0, 22)}...│`);
    console.log(`   │ Hub Price:        ${config.hubSubscriptionPrice.toNumber() / MULTIPLIER} $SKR/month       │`);
    console.log(`   │ Feedback Deposit: ${config.feedbackDeposit.toNumber() / MULTIPLIER} $SKR             │`);
    console.log(`   │ DAO Deposit:      ${config.daoProposalDeposit.toNumber() / MULTIPLIER} $SKR             │`);
    console.log(`   │ Talent Deposit:   ${config.talentDeposit.toNumber() / MULTIPLIER} $SKR              │`);
    console.log(`   │ Top Ad/week:      ${config.topAdPricePerWeek.toNumber() / MULTIPLIER} $SKR           │`);
    console.log(`   │ Bottom Ad/week:   ${config.bottomAdPricePerWeek.toNumber() / MULTIPLIER} $SKR             │`);
    console.log(`   │ DAO Brand:        ${config.daoBrandShareBps / 100}%                 │`);
    console.log(`   │ DAO Platform:     ${config.daoPlatformShareBps / 100}%                  │`);
    console.log(`   │ Total Hubs:       ${config.totalHubs}                    │`);
    console.log("   └─────────────────────────────────────────────┘");
    console.log("");

    // Assert pricing matches
    assert.equal(config.hubSubscriptionPrice.toNumber(), PRICING.hubSubscriptionPrice.toNumber());
    assert.equal(config.feedbackDeposit.toNumber(), PRICING.feedbackDeposit.toNumber());
    assert.equal(config.daoProposalDeposit.toNumber(), PRICING.daoProposalDeposit.toNumber());
    assert.equal(config.talentDeposit.toNumber(), PRICING.talentDeposit.toNumber());
    assert.equal(config.topAdPricePerWeek.toNumber(), PRICING.topAdPricePerWeek.toNumber());
    assert.equal(config.bottomAdPricePerWeek.toNumber(), PRICING.bottomAdPricePerWeek.toNumber());
    assert.equal(config.daoBrandShareBps, PRICING.daoBrandShareBps);
    assert.equal(config.daoPlatformShareBps, PRICING.daoPlatformShareBps);
    console.log("   ✅ All pricing values match frontend constants!");
    console.log("");
  });

  // ============================================
  // STEP 3: Initialize Admin User Score
  // ============================================

  it("Step 3: Initialize admin user score", async () => {
    try {
      const existing: any = await program.account.userScore.fetch(userScorePda);
      console.log(`   ⚠️  User score already initialized (score: ${existing.totalScore})`);
      return;
    } catch {
      // Not initialized — proceed
    }

    const tx = await program.methods
      .initUserScore()
      .accounts({
        user: admin.publicKey,
        userScore: userScorePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`   ✅ User score initialized`);
    console.log(`   Tx: ${tx}`);

    const score: any = await program.account.userScore.fetch(userScorePda);
    assert.equal(score.user.toString(), admin.publicKey.toString());
    assert.equal(score.totalScore, 0);
    console.log(`   Score: ${score.totalScore} (fresh)`);
    console.log("");
  });

  // ============================================
  // STEP 4: Create Test Hub
  // ============================================

  it("Step 4: Create test hub 'Solana Gaming'", async () => {
    // Only on localnet where we have test $SKR
    if (!isLocalnet) {
      console.log("   ⚠️  Skipping hub creation on devnet (need real $SKR tokens)");
      return;
    }

    try {
      const existing: any = await program.account.hub.fetch(hubPda);
      console.log(`   ⚠️  Hub already exists: "${existing.name}"`);
      return;
    } catch {
      // Hub doesn't exist — create it
    }

    const tx = await program.methods
      .createHub(
        "Solana Gaming",
        "Latest gaming news and updates on Solana",
        { gaming: {} },
        hubIndex
      )
      .accounts({
        creator: admin.publicKey,
        hub: hubPda,
        platformConfig: platformConfigPda,
        creatorTokenAccount: adminTokenAccount,
        treasuryTokenAccount: treasuryTokenAccountPk,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`   ✅ Test hub "Solana Gaming" created!`);
    console.log(`   Hub PDA: ${hubPda.toString()}`);
    console.log(`   Tx: ${tx}`);
    console.log("");

    const hub: any = await program.account.hub.fetch(hubPda);
    assert.equal(hub.name, "Solana Gaming");
    assert.equal(hub.isActive, true);
    assert.equal(hub.subscriberCount, 0);
    console.log("   ✅ Hub verified on-chain");
    console.log("");
  });

  // ============================================
  // STEP 5: Subscribe admin to hub
  // ============================================

  it("Step 5: Subscribe admin to test hub", async () => {
    if (!isLocalnet) {
      console.log("   ⚠️  Skipping on devnet");
      return;
    }

    const [subscriptionPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("subscription"),
        admin.publicKey.toBuffer(),
        hubPda.toBuffer(),
      ],
      program.programId
    );

    const tx = await program.methods
      .subscribeToHub()
      .accounts({
        user: admin.publicKey,
        hub: hubPda,
        subscription: subscriptionPda,
        userScore: userScorePda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`   ✅ Admin subscribed to Solana Gaming`);
    console.log(`   Tx: ${tx}`);

    const hub: any = await program.account.hub.fetch(hubPda);
    assert.equal(hub.subscriberCount, 1);

    const score: any = await program.account.userScore.fetch(userScorePda);
    console.log(`   Score after subscribe: ${score.totalScore} (should be 10)`);
    assert.equal(score.totalScore, 10);
    console.log("");
  });

  // ============================================
  // FINAL SUMMARY
  // ============================================

  it("Print deployment summary", async () => {
    console.log("");
    console.log("═══════════════════════════════════════════════");
    console.log("   📊 DEEP Pulse — Deployment Summary");
    console.log("═══════════════════════════════════════════════");
    console.log("");
    console.log(`   Program ID:     ${program.programId.toString()}`);
    console.log(`   Network:        ${isLocalnet ? "localnet" : "devnet"}`);
    console.log(`   Admin:          ${admin.publicKey.toString()}`);
    console.log(`   $SKR Mint:      ${skrMint.toString()}`);
    console.log(`   PlatformConfig: ${platformConfigPda.toString()}`);
    console.log(`   Treasury:       ${treasuryPda.toString()}`);
    console.log(`   User Score:     ${userScorePda.toString()}`);
    console.log(`   Test Hub:       ${hubPda.toString()}`);
    console.log("");
    if (!isLocalnet) {
      console.log("   🔗 Solana Explorer:");
      console.log(`   https://explorer.solana.com/address/${program.programId}?cluster=devnet`);
      console.log("");
    }
    console.log("   📱 Frontend Config (src/config/constants.js):");
    console.log(`   PROGRAM_ID:  ${program.programId} ✅`);
    console.log(`   SKR_MINT:    ${skrMint} ${skrMint.equals(REAL_SKR_MINT) ? "✅ (real)" : "⚠️ (test — update for devnet)"}`);
    console.log(`   NETWORK:     ${isLocalnet ? "localnet" : "devnet"} ✅`);
    console.log("");
    console.log("   🎯 All initialization steps completed successfully!");
    console.log("");
    console.log("═══════════════════════════════════════════════");
  });
});
