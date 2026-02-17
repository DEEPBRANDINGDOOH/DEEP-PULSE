#!/bin/bash

# 🚀 DEEP PULSE - Build Script
# Version: 2.0.0 - Hackathon Ready
# Date: Février 2026

set -e  # Exit on error

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  🚀 DEEP PULSE - Automated Build Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Functions
log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# 1. Check Node.js
echo "1️⃣  Checking Node.js..."
if ! command -v node &> /dev/null; then
    log_error "Node.js not found!"
    echo "Install Node.js 18+ from: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js version too old: $(node -v)"
    echo "Require Node.js 18+. Install from: https://nodejs.org"
    exit 1
fi
log_success "Node.js $(node -v) ✓"

# 2. Check Android SDK
echo ""
echo "2️⃣  Checking Android SDK..."
if [ -z "$ANDROID_HOME" ]; then
    log_warn "ANDROID_HOME not set"
    echo "Looking for Android SDK in common locations..."
    
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
        log_success "Found Android SDK: $ANDROID_HOME"
    elif [ -d "/usr/local/android-sdk" ]; then
        export ANDROID_HOME="/usr/local/android-sdk"
        log_success "Found Android SDK: $ANDROID_HOME"
    else
        log_error "Android SDK not found!"
        echo "Install Android Studio and set ANDROID_HOME"
        exit 1
    fi
else
    log_success "Android SDK: $ANDROID_HOME ✓"
fi

# 3. Install dependencies
echo ""
echo "3️⃣  Installing dependencies..."
if [ ! -d "node_modules" ]; then
    log_success "Running npm install..."
    npm install
else
    log_success "node_modules exists, skipping install"
fi

# 4. Generate android/ folder
echo ""
echo "4️⃣  Checking android/ folder..."
if [ ! -d "android" ]; then
    log_warn "android/ folder missing, generating..."
    
    npx react-native init TempProject --version 0.74.1
    cp -r TempProject/android ./
    rm -rf TempProject
    
    log_success "android/ folder generated ✓"
    
    # Copy configs
    if [ -d "android-config" ]; then
        log_success "Copying Android configurations..."
        cp android-config/AndroidManifest.xml android/app/src/main/
        cp android-config/build.gradle android/app/
        cp android-config/gradle.properties android/
        log_success "Android configs copied ✓"
    fi
else
    log_success "android/ folder exists ✓"
fi

# 5. Create local.properties
echo ""
echo "5️⃣  Configuring local.properties..."
if [ ! -f "android/local.properties" ]; then
    echo "sdk.dir=$ANDROID_HOME" > android/local.properties
    log_success "local.properties created ✓"
else
    log_success "local.properties exists ✓"
fi

# 6. Check Java
echo ""
echo "6️⃣  Checking Java..."
if ! command -v java &> /dev/null; then
    log_error "Java not found!"
    echo "Install Java JDK 17 from: https://adoptium.net"
    exit 1
fi
log_success "Java $(java -version 2>&1 | head -n 1) ✓"

# 7. Clean build
echo ""
echo "7️⃣  Cleaning previous builds..."
cd android
./gradlew clean
log_success "Clean completed ✓"

# 8. Build APK
echo ""
echo "8️⃣  Building APK..."
echo "⏳  This may take 5-15 minutes..."
echo ""
./gradlew assembleDebug

if [ $? -eq 0 ]; then
    log_success "Build successful! ✓"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  🎉 APK BUILD SUCCESSFUL!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "📱 APK Location:"
    echo "   android/app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "📊 Size: $(du -h app/build/outputs/apk/debug/app-debug.apk | cut -f1)"
    echo ""
    echo "🔧 To install on your device:"
    echo "   adb install app/build/outputs/apk/debug/app-debug.apk"
    echo ""
    echo "🚀 To launch the app:"
    echo "   adb shell am start -n com.deeppulse/.MainActivity"
    echo ""
else
    log_error "Build failed!"
    echo ""
    echo "🐛 Troubleshooting:"
    echo "1. Check the logs above for errors"
    echo "2. Try: ./gradlew assembleDebug --stacktrace"
    echo "3. Verify all dependencies are installed"
    echo "4. Check that minSdk is 26 in build.gradle"
    exit 1
fi

cd ..

# 9. Check for connected devices
echo ""
echo "9️⃣  Checking for connected devices..."
if command -v adb &> /dev/null; then
    DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)
    if [ "$DEVICES" -gt 0 ]; then
        log_success "Device(s) detected: $DEVICES"
        echo ""
        read -p "Install APK now? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            adb install -r android/app/build/outputs/apk/debug/app-debug.apk
            log_success "APK installed! ✓"
            
            read -p "Launch app? (y/N) " -n 1 -r
            echo
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                adb shell am start -n com.deeppulse/.MainActivity
                log_success "App launched! ✓"
            fi
        fi
    else
        log_warn "No devices connected"
        echo "Connect your Solana Seeker via USB and enable USB debugging"
    fi
else
    log_warn "adb not found (optional)"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ BUILD PROCESS COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo "1. Test all app features"
echo "2. Take screenshots"
echo "3. Record demo video (optional)"
echo "4. Submit to hackathon!"
echo ""
echo "📄 See README.md for full documentation"
echo ""
