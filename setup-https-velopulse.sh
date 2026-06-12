#!/bin/bash

# VeloPulse HTTPS Setup für velopulse.de
DOMAIN="velopulse.de"
EMAIL="info@velopulse.de"  # ÄNDERN Sie dies zu Ihrer echten Email!

echo "🔐 VeloPulse HTTPS Setup für $DOMAIN"
echo ""

# 1. Nginx und Certbot installieren
echo "📦 Installiere Nginx und Certbot..."
sudo apt-get update
sudo apt-get install nginx certbot python3-certbot-nginx -y

# 2. Nginx Config erstellen
echo "📝 Erstelle Nginx Konfiguration..."
sudo tee /etc/nginx/sites-available/velopulse > /dev/null <<'EOF'
server {
    listen 80;
    server_name velopulse.de www.velopulse.de;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:5000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SignalR WebSockets
    location /hubs/ {
        proxy_pass http://localhost:5000/hubs/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# 3. Aktivieren
echo "✅ Aktiviere Nginx Config..."
sudo ln -sf /etc/nginx/sites-available/velopulse /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# 4. Firewall
echo "🔥 Konfiguriere Firewall..."
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 5. SSL-Zertifikat holen
echo "🔐 Hole SSL-Zertifikat von Let's Encrypt..."
echo "WICHTIG: Stellen Sie sicher, dass velopulse.de auf $HOSTNAME zeigt!"
echo ""
read -p "Fortfahren? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    sudo certbot --nginx -d velopulse.de -d www.velopulse.de --email $EMAIL --agree-tos --redirect
fi

# 6. .env.production aktualisieren
echo "📝 Aktualisiere .env.production..."
cd ~/velopulse
cp .env.production .env.production.backup-$(date +%Y%m%d-%H%M%S)
sed -i "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://velopulse.de,https://www.velopulse.de,http://localhost:8080|" .env.production
sed -i "s|VITE_API_URL=.*|VITE_API_URL=https://velopulse.de|" .env.production

echo ""
echo "Neue .env.production:"
cat .env.production

# 7. Container neu starten
echo ""
echo "🔄 Starte Container neu..."
docker-compose -f docker-compose.prod.yml --env-file .env.production down
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

echo ""
echo "⏳ Warte auf Container-Start..."
sleep 30

echo ""
echo "📊 Container Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "=========================================="
echo "✅ HTTPS Setup abgeschlossen!"
echo "=========================================="
echo "🌐 Ihre Anwendung:"
echo "   https://velopulse.de"
echo "   https://www.velopulse.de"
echo ""
echo "🔐 SSL-Zertifikat:"
echo "   Gültig für 90 Tage"
echo "   Auto-Renewal konfiguriert"
echo ""
echo "📱 GPS funktioniert jetzt (HTTPS erforderlich)!"
echo ""
echo "🧪 Testen Sie:"
echo "   curl -I https://velopulse.de"
echo "=========================================="
