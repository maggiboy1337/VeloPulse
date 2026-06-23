#!/bin/bash

# VeloPulse Deployment Script für VPS
# Dieses Script automatisiert das Deployment auf Ihrem VPS Server

set -e  # Bei Fehler abbrechen

echo "🚀 VeloPulse Deployment gestartet..."

# Parse options
BUILD_APK=false
for arg in "$@"; do
    case "$arg" in
        --build-apk)
            BUILD_APK=true
            ;;
        *)
            ;;
    esac
done

# Farben für Output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# 1. Git Pull (neueste Version holen)
echo -e "${YELLOW}📥 Hole neueste Version von Git...${NC}"
git pull origin main

# 2. Environment Datei prüfen
if [ ! -f .env.production ]; then
    echo -e "${RED}❌ Fehler: .env.production nicht gefunden!${NC}"
    echo "Bitte erstellen Sie die Datei aus .env.production.template"
    exit 1
fi

# 3. Alte Container stoppen und entfernen
echo -e "${YELLOW}🛑 Stoppe alte Container...${NC}"
docker-compose -f docker-compose.prod.yml down

# Optional: Build Android APK before building images
if [ "$BUILD_APK" = true ]; then
    echo -e "${YELLOW}🔧 Baue Android APK (Option --build-apk aktiv)${NC}"
    # call helper script in repo root; script will prepare web build and capacitor sync
    if [ -f ./build-android-apk.sh ]; then
        bash ./build-android-apk.sh || echo -e "${RED}⚠️ build-android-apk.sh returned non-zero (continue)${NC}"
    else
        echo -e "${RED}❌ build-android-apk.sh nicht gefunden im Repo-Root${NC}"
    fi

    # Try to run Gradle assembleRelease if android gradle wrapper exists
    if [ -d "apps/public_web/android" ] && [ -f "apps/public_web/android/gradlew" ]; then
        echo -e "${YELLOW}⚙️ Versuche Gradle assembleRelease in apps/public_web/android${NC}"
        (cd apps/public_web/android && ./gradlew assembleRelease) || echo -e "${RED}⚠️ Gradle build fehlgeschlagen oder nicht konfiguriert${NC}"
    else
        echo -e "${YELLOW}ℹ️ Kein Gradle-Wrapper gefunden, überspringe nativen APK-Build${NC}"
    fi

    # If an APK was produced, copy it into backend/wwwroot/downloads
    APK_PATH="apps/public_web/android/app/build/outputs/apk/release/app-release.apk"
    if [ -f "$APK_PATH" ]; then
        DEST_DIR="backend/LiveTracking.Api/wwwroot/downloads"
        mkdir -p "$DEST_DIR"
        cp "$APK_PATH" "$DEST_DIR/velopulse-latest.apk"
        echo -e "${GREEN}✅ APK kopiert nach $DEST_DIR/velopulse-latest.apk${NC}"
    else
        echo -e "${YELLOW}⚠️ APK nicht gefunden unter $APK_PATH — evtl. manuell signieren/builden erforderlich${NC}"
    fi
fi

# 4. Neue Images bauen
echo -e "${YELLOW}🔨 Baue neue Docker Images...${NC}"
docker-compose -f docker-compose.prod.yml build --no-cache

# 5. Container starten
echo -e "${YELLOW}▶️  Starte Container...${NC}"
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# 6. Warten auf Backend Start
echo -e "${YELLOW}⏳ Warte auf Backend...${NC}"
sleep 10

# 7. Logs anzeigen (erste 20 Zeilen)
echo -e "${YELLOW}📋 Backend Logs:${NC}"
docker logs --tail 20 velopulse-backend

# 8. Status prüfen
echo -e "${YELLOW}🔍 Container Status:${NC}"
docker-compose -f docker-compose.prod.yml ps

# 9. Alte Images aufräumen
echo -e "${YELLOW}🧹 Räume alte Images auf...${NC}"
docker image prune -f

echo -e "${GREEN}✅ Deployment erfolgreich!${NC}"
echo ""
echo "🌐 Frontend: http://localhost:8080"
echo "🔧 Backend API: http://localhost:5000/api"
echo ""
echo "📊 Logs anzeigen:"
echo "  docker logs -f velopulse-backend"
echo "  docker logs -f velopulse-frontend"
echo ""
echo "🛑 Stoppen:"
echo "  docker-compose -f docker-compose.prod.yml down"
