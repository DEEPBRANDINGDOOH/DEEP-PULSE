#!/bin/bash
# ============================================
# DEEP Pulse — Deploy to Solana Devnet
# ============================================
#
# Prerequisites:
#   - Solana CLI installed (v3.x)
#   - Anchor CLI 0.30.1 installed
#   - Program compiled: target/deploy/deep_pulse.so
#
# Usage:
#   chmod +x scripts/deploy-devnet.sh
#   ./scripts/deploy-devnet.sh
# ============================================

set -e

PROGRAM_ID="33vWX6efKQSZ98dk3bnbHUjEYhB7LyvbH4ndpKjC6iY4"
DEPLOY_DIR="target/deploy"
SO_FILE="$DEPLOY_DIR/deep_pulse.so"
KEYPAIR_FILE="$DEPLOY_DIR/deep_pulse-keypair.json"

echo "🔗 DEEP Pulse — Solana Devnet Deployment"
echo "========================================="

# Check prerequisites
if ! command -v solana &> /dev/null; then
    echo "❌ Solana CLI not found. Install: https://docs.solana.com/cli/install-solana-cli-tools"
    exit 1
fi

if [ ! -f "$SO_FILE" ]; then
    echo "❌ Compiled program not found at $SO_FILE"
    echo "   Run 'anchor build' or 'cargo build-sbf' first"
    exit 1
fi

if [ ! -f "$KEYPAIR_FILE" ]; then
    echo "❌ Program keypair not found at $KEYPAIR_FILE"
    exit 1
fi

# Configure for devnet
echo ""
echo "📡 Configuring Solana CLI for devnet..."
solana config set --url devnet

# Check wallet
WALLET=$(solana address)
echo "👛 Deployer wallet: $WALLET"

# Check balance
BALANCE=$(solana balance | awk '{print $1}')
echo "💰 Current balance: $BALANCE SOL"

# Need at least 5 SOL for deployment
NEEDED=5
if (( $(echo "$BALANCE < $NEEDED" | bc -l) )); then
    echo ""
    echo "⚠️  Insufficient SOL for deployment (need ~$NEEDED SOL)"
    echo ""
    echo "Getting SOL from faucet..."

    # Try multiple airdrop attempts
    for i in 1 2 3; do
        echo "  Attempt $i: Requesting 2 SOL..."
        if solana airdrop 2 2>/dev/null; then
            echo "  ✅ Airdrop successful!"
        else
            echo "  ⏳ Rate limited, waiting 15s..."
            sleep 15
        fi
    done

    BALANCE=$(solana balance | awk '{print $1}')
    echo ""
    echo "💰 Updated balance: $BALANCE SOL"

    if (( $(echo "$BALANCE < $NEEDED" | bc -l) )); then
        echo ""
        echo "❌ Still insufficient SOL. Please get devnet SOL manually:"
        echo "   1. Visit https://faucet.solana.com"
        echo "   2. Enter wallet: $WALLET"
        echo "   3. Select 'Devnet' and request 5 SOL"
        echo "   4. Re-run this script"
        exit 1
    fi
fi

# Deploy
echo ""
echo "🚀 Deploying program..."
echo "   Program ID: $PROGRAM_ID"
echo "   Binary: $SO_FILE ($(du -h $SO_FILE | awk '{print $1}'))"
echo ""

solana program deploy "$SO_FILE" \
    --program-id "$KEYPAIR_FILE" \
    --url devnet \
    --with-compute-unit-price 1000

echo ""
echo "✅ Deployment successful!"
echo ""
echo "📋 Verify on Solana Explorer:"
echo "   https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "📋 Program Info:"
solana program show "$PROGRAM_ID"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Next: Initialize platform"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Run the initialization script:"
echo "   ANCHOR_PROVIDER_URL=https://api.devnet.solana.com \\"
echo "   ANCHOR_WALLET=~/.config/solana/id.json \\"
echo "   npx ts-node scripts/init-devnet.ts"
echo ""
echo "Or run both deploy + init:"
echo "   npm run devnet:deploy-and-init"
