# Wrath Deployment Guide

Complete step-by-step guide to deploy Wrath on your server with Docker.

---

## 📋 Pre-Deployment Checklist

- [ ] Server with Docker & Docker Compose installed
- [ ] Domain name pointed to server IP
- [ ] SSL certificates from reg.ru
- [ ] SSH access to server
- [ ] Firewall allows ports 80, 443, 22

---

## 🖥️ Server Setup

### 1. Install Docker & Docker Compose

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin

# Enable Docker
sudo systemctl enable --now docker

# Add your user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Verify Installation
```bash
docker --version
docker compose version
```

---

## 🌐 Domain & SSL Setup

### 1. Point Domain to Server
Add A record in your DNS:
```
Type: A
Name: @ (or wrath)
Value: YOUR_SERVER_IP
TTL: 300
```

### 2. Get SSL Certificates from reg.ru

1. Log into reg.ru
2. Go to SSL Certificates → Your Certificate
3. Download the certificate files:
   - `wrath.heroshish.ru.crt` (certificate)
   - `wrath.heroshish.ru.key` (private key)
   - `ca-bundle.crt` (optional, intermediate certs)

### 3. Prepare SSL Directory
```bash
mkdir -p /opt/wrath/nginx/ssl
```

### 4. Upload Certificates
```bash
# From your local machine
scp wrath.heroshish.ru.crt wrath.heroshish.ru.key user@your-server:/opt/wrath/nginx/ssl/

# On server, combine if you have CA bundle
cat /opt/wrath/nginx/ssl/wrath.heroshish.ru.crt /opt/wrath/nginx/ssl/ca-bundle.crt > /opt/wrath/nginx/ssl/wrath.heroshish.ru.full.crt
mv /opt/wrath/nginx/ssl/wrath.heroshish.ru.full.crt /opt/wrath/nginx/ssl/wrath.heroshish.ru.crt
```

### 5. Verify Certificates
```bash
openssl x509 -in /opt/wrath/nginx/ssl/wrath.heroshish.ru.crt -text -noout | grep -E "Subject:|Issuer:|Not After"
openssl rsa -in /opt/wrath/nginx/ssl/wrath.heroshish.ru.key -check
```

---

## 📥 Project Deployment

### 1. Clone Repository
```bash
cd /opt
git clone https://github.com/yourusername/wrath.git
cd wrath
```

### 2. Configure Environment
```bash
cp .env.example .env
nano .env
```

**Required `.env` values:**
```bash
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://wrath.heroshish.ru
JWT_SECRET=your-64-character-random-string-here-minimum-32-chars
```

**Generate JWT_SECRET:**
```bash
openssl rand -base64 48
```

### 3. Run Deployment Script
```bash
sudo ./scripts/deploy.sh
```

The script will:
1. ✅ Pull latest code
2. ✅ Validate `.env` configuration
3. ✅ Verify SSL certificates exist
4. ✅ Build Docker images
5. ✅ Start all services
6. ✅ Run database initialization
7. ✅ Clean up old images

### 4. Verify Deployment
```bash
# Check service status
docker-compose ps

# Should show all services as "healthy"
# NAME                STATUS
# wrath-nginx         Up (healthy)
# wrath-frontend      Up (healthy)
# wrath-backend       Up (healthy)
```

### 5. Test Application
Open browser: `https://wrath.heroshish.ru`

- Register a new account
- Create a workspace
- Create a page
- Test all features

---

## 🔧 Post-Deployment Setup

### 1. Enable Auto-Updates (Recommended)
```bash
# Copy systemd files
sudo cp scripts/wrath-auto-update.service /etc/systemd/system/
sudo cp scripts/wrath-auto-update.timer /etc/systemd/system/

# Reload and enable
sudo systemctl daemon-reload
sudo systemctl enable --now wrath-auto-update.timer

# Verify
systemctl list-timers | grep wrath
```

### 2. Setup Automated Backups
```bash
# Create backup cron job (daily at 2 AM)
sudo crontab -e

# Add:
0 2 * * * /opt/wrath/scripts/backup.sh >> /var/log/wrath-backup.log 2>&1
```

### 3. Configure Log Rotation
```bash
sudo nano /etc/logrotate.d/wrath

# Add:
/var/log/wrath-*.log {
    daily
    rotate 14
    compress
    delaycompress
    missingok
    notifempty
    create 644 root root
}
```

### 4. Setup Monitoring (Optional)
```bash
# Install Prometheus node exporter
# Or use: docker run -d --name node-exporter -p 9100:9100 prom/node-exporter
```

---

## 🔍 Verification Checklist

After deployment, verify:

- [ ] Site loads at `https://wrath.heroshish.ru`
- [ ] SSL certificate valid (green lock)
- [ ] Registration works
- [ ] Login/logout works
- [ ] Workspace creation works
- [ ] Page creation/editing works
- [ ] Real-time features work (open page in two browsers)
- [ ] File upload works
- [ ] Search works
- [ ] Mobile responsive
- [ ] Dark mode works (system preference)

---

## 📊 Health Checks

### Manual Health Check
```bash
# Backend API
curl https://wrath.heroshish.ru/health
# Should return: {"status":"ok","timestamp":"..."}

# Frontend
curl -I https://wrath.heroshish.ru/
# Should return: 200 OK
```

### Docker Health Checks
```bash
docker-compose ps
# All services should show "healthy"
```

### Database Check
```bash
docker-compose exec backend sqlite3 /app/data/wrath.db ".tables"
# Should list all tables
```

---

## 🚨 Troubleshooting

### Services Not Starting

**Check logs:**
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f nginx
```

**Common issues:**

| Issue | Solution |
|-------|----------|
| Port 80/443 in use | `sudo lsof -i :80` — stop conflicting service |
| SSL certs invalid | Verify cert/key match: `openssl x509 -noout -modulus -in cert.crt \| openssl md5` and same for key |
| JWT_SECRET missing | Set in `.env` and redeploy |
| Database locked | `docker-compose down && docker volume rm wrath_wrath-data && docker-compose up -d` |

### Backend Not Accessible
```bash
# Test internal connectivity
docker-compose exec frontend wget -qO- http://backend:3000/health

# Check nginx config
docker-compose exec nginx nginx -t
```

### WebSocket Issues
```bash
# Verify nginx has WebSocket support
grep -A 10 "socket.io" /opt/wrath/nginx/nginx.conf

# Check browser console for connection errors
```

### File Upload Fails
```bash
# Check permissions
docker-compose exec backend ls -la /app/uploads

# Fix if needed
docker-compose exec backend chown -R nodejs:nodejs /app/uploads
```

---

## 🔄 Updating Wrath

### Manual Update
```bash
cd /opt/wrath
git pull origin main
docker-compose build --no-cache
docker-compose up -d
docker-compose exec backend npm run db:init
```

### Using Deploy Script
```bash
sudo ./scripts/deploy.sh
```

### Rollback
```bash
# If update broke something
cd /opt/wrath
git log --oneline -5
git checkout PREVIOUS_COMMIT_HASH
docker-compose build --no-cache
docker-compose up -d
```

---

## 💾 Backup & Restore

### Create Backup
```bash
./scripts/backup.sh
# Output: /opt/wrath/backups/wrath_backup_YYYYMMDD_HHMMSS.tar.gz
```

### List Backups
```bash
ls -lh /opt/wrath/backups/
```

### Restore from Backup
```bash
# Stop services
docker-compose down

# Extract backup
cd /opt/wrath/backups
tar -xzf wrath_backup_YYYYMMDD_HHMMSS.tar.gz

# Restore database
cat wrath_backup_YYYYMMDD_HHMMSS.sql | docker-compose exec -T backend sqlite3 /app/data/wrath.db

# Restore uploads
tar -xzf wrath_backup_YYYYMMDD_HHMMSS_uploads.tar.gz -C /opt/wrath/wrath-uploads

# Start services
docker-compose up -d
```

---

## 🗑️ Uninstall

```bash
# Stop and remove containers
docker-compose down -v

# Remove volumes (WARNING: deletes all data!)
docker volume rm wrath_wrath-data wrath_wrath-uploads

# Remove images
docker rmi $(docker images wrath* -q)

# Remove project
rm -rf /opt/wrath

# Remove systemd timers
sudo systemctl disable --now wrath-auto-update.timer
sudo rm /etc/systemd/system/wrath-auto-update.*
sudo systemctl daemon-reload
```

---

## 📞 Support

If you encounter issues:

1. Check logs: `docker-compose logs -f`
2. Verify all steps in this guide
3. Check GitHub Issues for similar problems
4. Create new issue with logs and error details

---

## 📝 Quick Reference

| Command | Description |
|---------|-------------|
| `docker-compose ps` | Service status |
| `docker-compose logs -f` | Follow logs |
| `docker-compose restart` | Restart services |
| `docker-compose exec backend sh` | Backend shell |
| `./scripts/deploy.sh` | Full deploy |
| `./scripts/backup.sh` | Create backup |
| `systemctl status wrath-auto-update.timer` | Auto-update status |

---

*Last updated: 2024*
*For Wrath v1.0.0+*