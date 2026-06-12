#!/bin/bash

# VeloPulse Status Check für velopulse.de
DOMAIN="velopulse.de"

echo "=========================================="
echo "🔍 VeloPulse Status Check"
echo "=========================================="

echo "🌐 DNS Check:"
echo "  IPv4:"
nslookup $DOMAIN 8.8.8.8 | grep -A 1 "Name:" | grep "Address:"
echo "  IPv6:"
nslookup $DOMAIN 8.8.8.8 | grep "AAAA"

echo ""
echo "🔐 SSL Certificate:"
echo | openssl s_client -servername $DOMAIN -connect $DOMAIN:443 2>/dev/null | openssl x509 -noout -dates -subject

echo ""
echo "📦 Docker Container:"
cd ~/velopulse
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "🧪 HTTPS Test:"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN)
echo "  Status: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ Seite erreichbar!"
else
    echo "  ❌ Fehler - Status Code: $HTTP_CODE"
fi

echo ""
echo "📝 Backend Logs (letzte 10 Zeilen):"
docker logs velopulse-backend --tail 10 2>&1 | grep -v "Executed DbCommand"

echo ""
echo "🗄️ Datenbank Status:"
docker exec velopulse-postgres psql -U postgres -d livetracking -c "SELECT COUNT(*) as user_count FROM \"AspNetUsers\";" 2>&1 | grep -v "NOTICE"

echo ""
echo "🌐 Öffnen Sie im Browser:"
echo "   https://velopulse.de"
echo "   https://www.velopulse.de"
echo "=========================================="
