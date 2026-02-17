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
  createAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import { DeepPulse } from "../target/types/deep_pulse";

describe("deep-pulse", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.DeepPulse as Program<DeepPulse>;

  // === Test wallets ===
  const admin = Keypair.generate();
  const brand = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const advertiser = Keypair.generate();

  // === Token ===
  let skrMint: PublicKey;
  let adminTokenAccount: PublicKey;
  let brandTokenAccount: PublicKey;
  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;
  let advertiserTokenAccount: PublicKey;
  let treasuryTokenAccount: PublicKey;

  // === PDAs ===
  let platformConfigPda: PublicKey;
  let platformConfigBump: number;
  let treasuryPda: PublicKey;
  let treasuryBump: number;

  // Hub tracking
  let hubPda: PublicKey;
  const hubIndex = 0;

  // Deposit tracking
  let depositPda: PublicKey;
  const depositIndex = 0;

  // Vault tracking
  let vaultPda: PublicKey;
  const vaultIndex = 0;

  // === Constants (match Rust) ===
  const SKR_DECIMALS = 6;
  const HUB_SUBSCRIPTION_PRICE = 2_000_000_000; // 2000 $SKR
  const FEEDBACK_DEPOSIT = 400_000_000; // 400 $SKR
  const DAO_PROPOSAL_DEPOSIT = 100_000_000; // 100 $SKR
  const TALENT_DEPOSIT = 50_000_000; // 50 $SKR
  const MINT_AMOUNT = 100_000_000_000; // 100,000 $SKR per wallet

  before(async () => {
    // Airdrop SOL to all test wallets
    const airdropPromises = [admin, brand, user1, user2, advertiser].map(
      async (kp) => {
        const sig = await provider.connection.requestAirdrop(
          kp.publicKey,
          10 * LAMPORTS_PER_SOL
        );
        await provider.connection.confirmTransaction(sig);
      }
    );
    await Promise.all(airdropPromises);

    // Create $SKR mint (simulating the existing SKR token for testing)
    skrMint = await createMint(
      provider.connection,
      admin,
      admin.publicKey,
      null,
      SKR_DECIMALS
    );

    // Create token accounts
    adminTokenAccount = await createAccount(
      provider.connection,
      admin,
      skrMint,
      admin.publicKey
    );
    brandTokenAccount = await createAccount(
      provider.connection,
      brand,
      skrMint,
      brand.publicKey
    );
    user1TokenAccount = await createAccount(
      provider.connection,
      user1,
      skrMint,
      user1.publicKey
    );
    user2TokenAccount = await createAccount(
      provider.connection,
      user2,
      skrMint,
      user2.publicKey
    );
    advertiserTokenAccount = await createAccount(
      provider.connection,
      advertiser,
      skrMint,
      advertiser.publicKey
    );

    // Mint $SKR tokens to all test wallets
    const mintPromises = [
      adminTokenAccount,
      brandTokenAccount,
      user1TokenAccount,
      user2TokenAccount,
      advertiserTokenAccount,
    ].map((account) =>
      mintTo(
        provider.connection,
        admin,
        skrMint,
        account,
        admin,
        MINT_AMOUNT
      )
    );
    await Promise.all(mintPromises);

    // Derive PDAs
    [platformConfigPda, platformConfigBump] =
      PublicKey.findProgramAddressSync(
        [Buffer.from("platform_config")],
        program.programId
      );

    [treasuryPda, treasuryBump] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );
  });

  // ==========================================
  // ADMIN TESTS
  // ==========================================

  describe("Admin", () => {
    it("Initialize platform", async () => {
      // Create treasury token account first (will be done by init instruction)
      const treasuryTokenAccountKp = Keypair.generate();

      await program.methods
        .initializePlatform(
          null, // hub_subscription_price (use default)
          null, // feedback_deposit
          null, // dao_proposal_deposit
          null, // talent_deposit
          null, // top_ad_price_per_week
          null, // bottom_ad_price_per_week
          null, // dao_brand_share_bps
          null, // dao_platform_share_bps
          null  // min_vault_contribution
        )
        .accounts({
          admin: admin.publicKey,
          platformConfig: platformConfigPda,
          skrMint: skrMint,
          treasury: treasuryPda,
          treasuryTokenAccount: treasuryTokenAccountKp.publicKey,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([admin, treasuryTokenAccountKp])
        .rpc();

      // Store treasury token account for later use
      treasuryTokenAccount = treasuryTokenAccountKp.publicKey;

      // Verify platform config
      const config = await program.account.platformConfig.fetch(
        platformConfigPda
      );
      assert.equal(config.admin.toString(), admin.publicKey.toString());
      assert.equal(config.skrMint.toString(), skrMint.toString());
      assert.equal(
        config.hubSubscriptionPrice.toNumber(),
        HUB_SUBSCRIPTION_PRICE
      );
      assert.equal(config.feedbackDeposit.toNumber(), FEEDBACK_DEPOSIT);
      assert.equal(
        config.daoProposalDeposit.toNumber(),
        DAO_PROPOSAL_DEPOSIT
      );
      assert.equal(config.talentDeposit.toNumber(), TALENT_DEPOSIT);
      assert.equal(config.daoBrandShareBps, 9500);
      assert.equal(config.daoPlatformShareBps, 500);
    });

    it("Update platform config (admin only)", async () => {
      await program.methods
        .updatePlatformConfig(
          new anchor.BN(3_000_000_000), // new hub price = 3000 $SKR
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        )
        .accounts({
          admin: admin.publicKey,
          platformConfig: platformConfigPda,
        })
        .signers([admin])
        .rpc();

      const config = await program.account.platformConfig.fetch(
        platformConfigPda
      );
      assert.equal(
        config.hubSubscriptionPrice.toNumber(),
        3_000_000_000
      );

      // Revert to original for other tests
      await program.methods
        .updatePlatformConfig(
          new anchor.BN(HUB_SUBSCRIPTION_PRICE),
          null,
          null,
          null,
          null,
          null,
          null,
          null,
          null
        )
        .accounts({
          admin: admin.publicKey,
          platformConfig: platformConfigPda,
        })
        .signers([admin])
        .rpc();
    });

    it("Reject non-admin config update", async () => {
      try {
        await program.methods
          .updatePlatformConfig(
            new anchor.BN(999),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            null
          )
          .accounts({
            admin: user1.publicKey,
            platformConfig: platformConfigPda,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown UnauthorizedAdmin error");
      } catch (err) {
        assert.include(err.toString(), "UnauthorizedAdmin");
      }
    });
  });

  // ==========================================
  // HUB TESTS
  // ==========================================

  describe("Hub", () => {
    it("Create hub", async () => {
      [hubPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("hub"),
          brand.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([hubIndex]).buffer)),
        ],
        program.programId
      );

      const brandBalanceBefore = (
        await getAccount(provider.connection, brandTokenAccount)
      ).amount;

      await program.methods
        .createHub("My DeFi Hub", "A great DeFi notification hub", { deFi: {} }, hubIndex)
        .accounts({
          creator: brand.publicKey,
          hub: hubPda,
          platformConfig: platformConfigPda,
          creatorTokenAccount: brandTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([brand])
        .rpc();

      const hub = await program.account.hub.fetch(hubPda);
      assert.equal(hub.name, "My DeFi Hub");
      assert.equal(hub.subscriberCount, 0);
      assert.equal(hub.isActive, true);
      assert.equal(hub.isVerified, false);

      // Verify $SKR was deducted
      const brandBalanceAfter = (
        await getAccount(provider.connection, brandTokenAccount)
      ).amount;
      assert.equal(
        Number(brandBalanceBefore) - Number(brandBalanceAfter),
        HUB_SUBSCRIPTION_PRICE
      );
    });

    it("Subscribe to hub", async () => {
      // Init user score first
      const [userScorePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_score"), user1.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initUserScore()
        .accounts({
          user: user1.publicKey,
          userScore: userScorePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      // Subscribe
      const [subscriptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("subscription"),
          user1.publicKey.toBuffer(),
          hubPda.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .subscribeToHub()
        .accounts({
          user: user1.publicKey,
          hub: hubPda,
          subscription: subscriptionPda,
          userScore: userScorePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const hub = await program.account.hub.fetch(hubPda);
      assert.equal(hub.subscriberCount, 1);

      const score = await program.account.userScore.fetch(userScorePda);
      assert.equal(score.subscribeCount, 1);
      assert.equal(score.totalScore, 10); // SCORE_SUBSCRIBE = 10
    });

    it("Unsubscribe from hub", async () => {
      const [subscriptionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("subscription"),
          user1.publicKey.toBuffer(),
          hubPda.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .unsubscribeFromHub()
        .accounts({
          user: user1.publicKey,
          hub: hubPda,
          subscription: subscriptionPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const hub = await program.account.hub.fetch(hubPda);
      assert.equal(hub.subscriberCount, 0);
    });

    it("Set hub verified (admin)", async () => {
      await program.methods
        .setHubVerified(true)
        .accounts({
          admin: admin.publicKey,
          hub: hubPda,
          platformConfig: platformConfigPda,
        })
        .signers([admin])
        .rpc();

      const hub = await program.account.hub.fetch(hubPda);
      assert.equal(hub.isVerified, true);
    });

    it("Renew hub subscription", async () => {
      const hubBefore = await program.account.hub.fetch(hubPda);
      const paidUntilBefore = hubBefore.subscriptionPaidUntil.toNumber();

      await program.methods
        .renewHubSubscription()
        .accounts({
          creator: brand.publicKey,
          hub: hubPda,
          platformConfig: platformConfigPda,
          creatorTokenAccount: brandTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([brand])
        .rpc();

      const hubAfter = await program.account.hub.fetch(hubPda);
      // Should extend by 30 days (2_592_000 seconds)
      assert.isAbove(
        hubAfter.subscriptionPaidUntil.toNumber(),
        paidUntilBefore
      );
    });
  });

  // ==========================================
  // DEPOSIT TESTS
  // ==========================================

  describe("Deposit / Escrow", () => {
    it("Create feedback deposit", async () => {
      [depositPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("deposit"),
          user1.publicKey.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([depositIndex]).buffer)),
        ],
        program.programId
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), depositPda.toBuffer()],
        program.programId
      );

      const escrowTokenAccountKp = Keypair.generate();

      const user1BalanceBefore = (
        await getAccount(provider.connection, user1TokenAccount)
      ).amount;

      await program.methods
        .createDeposit(
          { feedback: {} },
          Array.from(new Uint8Array(32)), // content_hash placeholder
          depositIndex
        )
        .accounts({
          depositor: user1.publicKey,
          hub: hubPda,
          deposit: depositPda,
          escrowTokenAccount: escrowTokenAccountKp.publicKey,
          escrowAuthority: escrowPda,
          platformConfig: platformConfigPda,
          depositorTokenAccount: user1TokenAccount,
          skrMint: skrMint,
          userScore: null,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user1, escrowTokenAccountKp])
        .rpc();

      // Verify deposit was created
      const deposit = await program.account.deposit.fetch(depositPda);
      assert.equal(deposit.depositor.toString(), user1.publicKey.toString());
      assert.equal(deposit.amount.toNumber(), FEEDBACK_DEPOSIT);

      // Verify tokens were locked in escrow
      const user1BalanceAfter = (
        await getAccount(provider.connection, user1TokenAccount)
      ).amount;
      assert.equal(
        Number(user1BalanceBefore) - Number(user1BalanceAfter),
        FEEDBACK_DEPOSIT
      );
    });

    it("Approve feedback (refund to user)", async () => {
      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), depositPda.toBuffer()],
        program.programId
      );

      const user1BalanceBefore = (
        await getAccount(provider.connection, user1TokenAccount)
      ).amount;

      await program.methods
        .approveFeedback()
        .accounts({
          resolver: brand.publicKey,
          deposit: depositPda,
          hub: hubPda,
          escrowTokenAccount: escrowPda, // This would be the actual escrow token account
          escrowAuthority: escrowPda,
          depositorTokenAccount: user1TokenAccount,
          depositor: user1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([brand])
        .rpc();

      // Verify deposit is approved
      const deposit = await program.account.deposit.fetch(depositPda);
      assert.deepEqual(deposit.status, { approved: {} });
    });

    it("Reject deposit (tokens to treasury)", async () => {
      // Create a new deposit to reject
      const rejectDepositIndex = 1;
      const [rejectDepositPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("deposit"),
          user1.publicKey.toBuffer(),
          Buffer.from(
            new Uint8Array(new Uint32Array([rejectDepositIndex]).buffer)
          ),
        ],
        program.programId
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), rejectDepositPda.toBuffer()],
        program.programId
      );

      const escrowTokenAccountKp = Keypair.generate();

      // Create the deposit first
      await program.methods
        .createDeposit(
          { talent: {} },
          Array.from(new Uint8Array(32)),
          rejectDepositIndex
        )
        .accounts({
          depositor: user1.publicKey,
          hub: hubPda,
          deposit: rejectDepositPda,
          escrowTokenAccount: escrowTokenAccountKp.publicKey,
          escrowAuthority: escrowPda,
          platformConfig: platformConfigPda,
          depositorTokenAccount: user1TokenAccount,
          skrMint: skrMint,
          userScore: null,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user1, escrowTokenAccountKp])
        .rpc();

      // Now reject it
      await program.methods
        .rejectDeposit()
        .accounts({
          resolver: brand.publicKey,
          deposit: rejectDepositPda,
          hub: hubPda,
          escrowTokenAccount: escrowTokenAccountKp.publicKey,
          escrowAuthority: escrowPda,
          treasuryTokenAccount: treasuryTokenAccount,
          depositor: user1.publicKey,
          platformConfig: platformConfigPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([brand])
        .rpc();

      const deposit = await program.account.deposit.fetch(rejectDepositPda);
      assert.deepEqual(deposit.status, { rejected: {} });
    });
  });

  // ==========================================
  // DAO VAULT TESTS
  // ==========================================

  describe("DAO Vault", () => {
    it("Approve DAO proposal (creates vault)", async () => {
      // Create a DAO proposal deposit first
      const daoDepositIndex = 2;
      const [daoDepositPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("deposit"),
          user1.publicKey.toBuffer(),
          Buffer.from(
            new Uint8Array(new Uint32Array([daoDepositIndex]).buffer)
          ),
        ],
        program.programId
      );

      const [escrowPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("escrow"), daoDepositPda.toBuffer()],
        program.programId
      );

      const escrowTokenAccountKp = Keypair.generate();

      await program.methods
        .createDeposit(
          { daoProposal: {} },
          Array.from(new Uint8Array(32)),
          daoDepositIndex
        )
        .accounts({
          depositor: user1.publicKey,
          hub: hubPda,
          deposit: daoDepositPda,
          escrowTokenAccount: escrowTokenAccountKp.publicKey,
          escrowAuthority: escrowPda,
          platformConfig: platformConfigPda,
          depositorTokenAccount: user1TokenAccount,
          skrMint: skrMint,
          userScore: null,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user1, escrowTokenAccountKp])
        .rpc();

      // Derive vault PDA
      [vaultPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("vault"),
          hubPda.toBuffer(),
          Buffer.from(new Uint8Array(new Uint32Array([vaultIndex]).buffer)),
        ],
        program.programId
      );

      const [vaultTokenPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_token"), vaultPda.toBuffer()],
        program.programId
      );

      const vaultTokenAccountKp = Keypair.generate();
      const targetAmount = 10_000_000_000; // 10,000 $SKR
      const expiresAt = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

      // Approve proposal (creates vault)
      await program.methods
        .approveDaoProposal(
          vaultIndex,
          "Community Boost Campaign",
          "Let's fund a marketing push for the hub",
          new anchor.BN(targetAmount),
          new anchor.BN(expiresAt)
        )
        .accounts({
          resolver: brand.publicKey,
          deposit: daoDepositPda,
          hub: hubPda,
          escrowTokenAccount: escrowTokenAccountKp.publicKey,
          escrowAuthority: escrowPda,
          depositorTokenAccount: user1TokenAccount,
          depositor: user1.publicKey,
          daoVault: vaultPda,
          vaultTokenAccount: vaultTokenAccountKp.publicKey,
          vaultTokenAuthority: vaultTokenPda,
          platformConfig: platformConfigPda,
          skrMint: skrMint,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([brand, vaultTokenAccountKp])
        .rpc();

      const vault = await program.account.daoVault.fetch(vaultPda);
      assert.equal(vault.title, "Community Boost Campaign");
      assert.equal(vault.targetAmount.toNumber(), targetAmount);
      assert.deepEqual(vault.status, { open: {} });
      assert.equal(vault.contributorCount, 0);
    });

    it("Contribute to vault", async () => {
      const [vaultTokenPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_token"), vaultPda.toBuffer()],
        program.programId
      );

      const [contributionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("contribution"),
          vaultPda.toBuffer(),
          user2.publicKey.toBuffer(),
        ],
        program.programId
      );

      const contributionAmount = 500_000_000; // 500 $SKR

      await program.methods
        .contributeToVault(new anchor.BN(contributionAmount))
        .accounts({
          contributor: user2.publicKey,
          daoVault: vaultPda,
          contribution: contributionPda,
          vaultTokenAccount: vaultTokenPda,
          contributorTokenAccount: user2TokenAccount,
          platformConfig: platformConfigPda,
          userScore: null,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const vault = await program.account.daoVault.fetch(vaultPda);
      assert.equal(vault.currentAmount.toNumber(), contributionAmount);
      assert.equal(vault.contributorCount, 1);

      const contribution = await program.account.vaultContribution.fetch(
        contributionPda
      );
      assert.equal(contribution.amount.toNumber(), contributionAmount);
      assert.equal(contribution.refunded, false);
    });

    it("Cancel vault and claim refund", async () => {
      // Brand cancels
      await program.methods
        .cancelVault()
        .accounts({
          caller: brand.publicKey,
          daoVault: vaultPda,
          platformConfig: platformConfigPda,
        })
        .signers([brand])
        .rpc();

      let vault = await program.account.daoVault.fetch(vaultPda);
      assert.deepEqual(vault.status, { cancelled: {} });

      // Contributor claims refund
      const [vaultTokenPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault_token"), vaultPda.toBuffer()],
        program.programId
      );

      const [contributionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("contribution"),
          vaultPda.toBuffer(),
          user2.publicKey.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .claimVaultRefund()
        .accounts({
          contributor: user2.publicKey,
          daoVault: vaultPda,
          contribution: contributionPda,
          vaultTokenAccount: vaultTokenPda,
          vaultTokenAuthority: vaultTokenPda,
          contributorTokenAccount: user2TokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user2])
        .rpc();

      const contribution = await program.account.vaultContribution.fetch(
        contributionPda
      );
      assert.equal(contribution.refunded, true);
    });
  });

  // ==========================================
  // AD SLOT TESTS
  // ==========================================

  describe("Ad Slots", () => {
    it("Purchase ad slot with discount", async () => {
      const slotIndex = 0;
      const [adSlotPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("ad_slot"),
          hubPda.toBuffer(),
          Buffer.from([0]), // SlotType::Top = 0
          Buffer.from([slotIndex]),
        ],
        program.programId
      );

      const durationWeeks = 4; // 10% discount
      const imageHash = Array.from(new Uint8Array(32));
      const landingHash = Array.from(new Uint8Array(32));

      const advBalanceBefore = (
        await getAccount(provider.connection, advertiserTokenAccount)
      ).amount;

      await program.methods
        .purchaseAdSlot(
          { top: {} },
          slotIndex,
          imageHash,
          landingHash,
          durationWeeks
        )
        .accounts({
          advertiser: advertiser.publicKey,
          hub: hubPda,
          adSlot: adSlotPda,
          platformConfig: platformConfigPda,
          advertiserTokenAccount: advertiserTokenAccount,
          treasuryTokenAccount: treasuryTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([advertiser])
        .rpc();

      const adSlot = await program.account.adSlot.fetch(adSlotPda);
      assert.equal(adSlot.isActive, true);
      assert.deepEqual(adSlot.slotType, { top: {} });

      // Verify discount applied (4 weeks = 10% off)
      // Base: 500 $SKR/week * 4 = 2000 $SKR = 2_000_000_000
      // Discount: 10% = 200_000_000
      // Final: 1_800_000_000
      const expectedPrice = 1_800_000_000;
      assert.equal(adSlot.amountPaid.toNumber(), expectedPrice);

      const advBalanceAfter = (
        await getAccount(provider.connection, advertiserTokenAccount)
      ).amount;
      assert.equal(
        Number(advBalanceBefore) - Number(advBalanceAfter),
        expectedPrice
      );
    });

    it("Update ad slot", async () => {
      const slotIndex = 0;
      const [adSlotPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("ad_slot"),
          hubPda.toBuffer(),
          Buffer.from([0]),
          Buffer.from([slotIndex]),
        ],
        program.programId
      );

      const newImageHash = Array.from(
        new Uint8Array(32).fill(1)
      );
      const newLandingHash = Array.from(
        new Uint8Array(32).fill(2)
      );

      await program.methods
        .updateAdSlot(newImageHash, newLandingHash)
        .accounts({
          advertiser: advertiser.publicKey,
          adSlot: adSlotPda,
        })
        .signers([advertiser])
        .rpc();

      const adSlot = await program.account.adSlot.fetch(adSlotPda);
      assert.deepEqual(
        Array.from(adSlot.imageUrlHash),
        newImageHash
      );
    });
  });

  // ==========================================
  // SCORING TESTS
  // ==========================================

  describe("Scoring", () => {
    it("Init user score", async () => {
      const [userScorePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("user_score"), user2.publicKey.toBuffer()],
        program.programId
      );

      await program.methods
        .initUserScore()
        .accounts({
          user: user2.publicKey,
          userScore: userScorePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user2])
        .rpc();

      const score = await program.account.userScore.fetch(userScorePda);
      assert.equal(score.user.toString(), user2.publicKey.toString());
      assert.equal(score.totalScore, 0);
      assert.equal(score.subscribeCount, 0);
    });
  });
});
