# VeloPulse - VPS Deployment Guide

## 📋 Voraussetzungen auf Ihrem VPS

- Ubuntu 20.04+ / Debian 11+ (oder ähnlich)
- Mindestens 2GB RAM
- Docker & Docker Compose installiert
- Domain oder Subdomain (optional, aber empfohlen)

---

## 🚀 Schnellstart - Deployment in 5 Schritten

### 1️⃣ VPS vorbereiten

```bash
# Als root oder mit sudo
# Docker installieren
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose Plugin
sudo apt-get update
sudo apt-get install docker-compose-plugin

# Git installieren
sudo apt-get install git
```

### 2️⃣ Projekt klonen

```bash
# SSH Key zu GitHub hinzufügen (empfohlen) oder HTTPS verwenden
cd /opt
sudo git clone https://github.com/IHR-USERNAME/velopulse.git
cd velopulse
```

### 3️⃣ Production Environment einrichten

```bash
# Template kopieren
cp .env.production.template .env.production

# Mit Editor öffnen und sichere Werte eintragen
nano .env.production
```

**Wichtig:** Ändern Sie diese Werte:
- `POSTGRES_PASSWORD` - Starkes Passwort (min. 20 Zeichen)
- `JWT_SECRET` - Zufälliger String (64 Zeichen)
- `CORS_ORIGINS` - Ihre Domain(s)
- `VITE_API_URL` - Ihre API URL

**Zufällige Werte generieren:**
```bash
# PostgreSQL Passwort
openssl rand -base64 32

# JWT Secret
openssl rand -hex 64
```

### 4️⃣ Deployen

```bash
# Deploy-Script ausführbar machen
chmod +x deploy.sh

# Deployment starten
./deploy.sh
```

### 5️⃣ Firewall konfigurieren

```bash
# UFW Firewall (Ubuntu/Debian)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (später für SSL)
sudo ufw enable
```

---

## 🌐 Mit Domain verbinden (Optional aber empfohlen)

### Nginx Reverse Proxy auf Host-System

```bash
# Nginx auf VPS installieren (außerhalb Docker)
sudo apt-get install nginx certbot python3-certbot-nginx

# Nginx Config erstellen
sudo nano /etc/nginx/sites-available/velopulse
```

**Nginx Config Inhalt:**
```nginx
server {
    listen 80;
    server_name ihre-domain.de www.ihre-domain.de;

    # Frontend
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # API
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
    }
}
```

**Aktivieren:**
```bash
# Symlink erstellen
sudo ln -s /etc/nginx/sites-available/velopulse /etc/nginx/sites-enabled/

# Nginx testen und neuladen
sudo nginx -t
sudo systemctl reload nginx
```

### SSL Zertifikat mit Let's Encrypt

```bash
# Automatisch SSL einrichten
sudo certbot --nginx -d ihre-domain.de -d www.ihre-domain.de

# Auto-Renewal testen
sudo certbot renew --dry-run
```

---

## 🔧 Nützliche Befehle

### Container Management
```bash
# Status anzeigen
docker-compose -f docker-compose.prod.yml ps

# Logs anzeigen (live)
docker logs -f velopulse-backend
docker logs -f velopulse-frontend

# Container neustarten
docker-compose -f docker-compose.prod.yml restart

# Container stoppen
docker-compose -f docker-compose.prod.yml down

# Alles löschen (inkl. Datenbank!)
docker-compose -f docker-compose.prod.yml down -v
```

### Updates deployen
```bash
# Einfach Script erneut ausführen
./deploy.sh
```

### Datenbank Backup
```bash
# Backup erstellen
docker exec velopulse-postgres pg_dump -U velopulse_user livetracking > backup_$(date +%Y%m%d_%H%M%S).sql

# Backup wiederherstellen
cat backup_20240101_120000.sql | docker exec -i velopulse-postgres psql -U velopulse_user livetracking
```

---

## 🐛 Troubleshooting

### Container startet nicht
```bash
# Logs prüfen
docker logs velopulse-backend
docker logs velopulse-postgres

# Container Status
docker-compose -f docker-compose.prod.yml ps
```

### Datenbank Connection Error
```bash
# Prüfen ob Postgres läuft
docker exec velopulse-postgres pg_isready -U velopulse_user

# Connection String prüfen
docker exec velopulse-backend env | grep ConnectionStrings
```

### Frontend erreicht Backend nicht
```bash
# Nginx Logs prüfen (im Container)
docker logs velopulse-frontend

# Backend erreichbar?
curl http://localhost:5000/api/health
```

---

## 📊 Monitoring

### Resource Usage
```bash
# Container Resource Usage
docker stats

# Disk Usage
docker system df
```

### Health Checks
```bash
# Backend Health
curl http://localhost:5000/health

# Frontend
curl http://localhost:8080
```

---

## 🔒 Sicherheit

### Empfohlene Maßnahmen:
- ✅ Sichere Passwörter in `.env.production`
- ✅ SSL/HTTPS aktivieren (Let's Encrypt)
- ✅ SSH Key-basierte Authentifizierung
- ✅ Firewall konfiguriert (UFW)
- ✅ Regelmäßige Updates: `apt-get update && apt-get upgrade`
- ✅ Automatische Backups einrichten

### SSH absichern
```bash
# /etc/ssh/sshd_config
PermitRootLogin no
PasswordAuthentication no
```

---

## 📝 Workflow nach GitHub Push

```bash
# Auf VPS via SSH einloggen
ssh user@ihre-vps-ip

# In Projektverzeichnis
cd /opt/velopulse

# Deployment ausführen
./deploy.sh
```

---

## 🆘 Support

Bei Problemen prüfen Sie:
1. Container Logs: `docker logs velopulse-backend`
2. Nginx Logs: `sudo tail -f /var/log/nginx/error.log`
3. Docker Status: `docker-compose -f docker-compose.prod.yml ps`
