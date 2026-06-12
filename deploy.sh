#!/bin/bash

# VeloPulse Deployment Script für VPS
# Dieses Script automatisiert das Deployment auf Ihrem VPS Server

set -e  # Bei Fehler abbrechen

echo "🚀 VeloPulse Deployment gestartet..."

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
