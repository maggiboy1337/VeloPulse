#!/bin/bash

# ============================================
# Build Android APK with Background HTTP
# Automated build script for CI/CD
# ============================================

set -e  # Exit on error

echo "========================================="
echo "🔨 Building VeloPulse Android APK"
echo "========================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm not found"
    exit 1
fi

echo "✅ Node.js $(node --version)"
echo "✅ npm $(npm --version)"
echo ""

# Navigate to project directory
cd "$(dirname "$0")/apps/public_web"

echo "📁 Working directory: $(pwd)"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Step 2: Check if backgroundHttpService exists
echo "🔍 Step 2: Verifying Background HTTP code..."
if [ ! -f "src/services/backgroundHttpService.ts" ]; then
    echo "❌ ERROR: backgroundHttpService.ts not found!"
    echo "   Please ensure the code was committed correctly."
    exit 1
fi
echo "✅ Background HTTP service found"
echo ""

# Step 3: Build web assets
echo "🏗️ Step 3: Building web assets..."
npm run build
echo "✅ Web build complete"
echo ""

# Step 4: Capacitor sync
echo "🔄 Step 4: Syncing with Capacitor..."
if ! command -v npx &> /dev/null; then
    echo "❌ npx not found"
    exit 1
fi

npx cap sync android
echo "✅ Capacitor sync complete"
echo ""

# Step 5: Check Android project
echo "🔍 Step 5: Checking Android project..."
if [ ! -d "android" ]; then
    echo "❌ Android directory not found"
    echo "   Run: npx cap add android"
    exit 1
fi
echo "✅ Android project exists"
echo ""

# Step 6: Instructions for final build
echo "========================================="
echo "✅ Build preparation complete!"
echo "========================================="
echo ""
echo "📱 Next steps for APK generation:"
echo ""
echo "Option 1: Android Studio (Recommended)"
echo "  1. Open Android Studio"
echo "  2. Open project: apps/public_web/android"
echo "  3. Build > Generate Signed Bundle/APK"
echo "  4. Select: APK > release"
echo "  5. Sign with your keystore"
echo ""
echo "Option 2: Command Line (requires keystore setup)"
echo "  cd android"
echo "  ./gradlew assembleRelease"
echo ""
echo "📋 Build info:"
echo "  Build date: $(date)"
echo "  Commit: $(git rev-parse --short HEAD)"
echo "  Branch: $(git branch --show-current)"
echo ""
echo "🚀 After building:"
echo "  1. Install: adb install -r android/app/build/outputs/apk/release/app-release.apk"
echo "  2. Test: ./test-background-http.sh"
echo ""
