#!/bin/bash

# Wrath Auto-Update Script
# Checks for updates on GitHub and deploys them automatically
# Add to crontab: 0 3 * * * /opt/wrath/scripts/auto-update.sh >> /var/log/wrath-auto-update.log 2>&1

set -e

PROJECT_DIR="/opt/wrath"
LOG_FILE="/var/log/wrath-auto-update.log"
COMPOSE_FILE="docker-compose.yml"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a $LOG_FILE
}

log "🔄 Checking for updates..."

cd $PROJECT_DIR

# Fetch latest changes
git fetch origin

# Check if there are new commits
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/main)

if [ "$LOCAL" = "$REMOTE" ]; then
    log "✅ Already up to date"
    exit 0
fi

log "📥 New updates found, deploying..."

# Show what changed
git log --oneline $LOCAL..$REMOTE | tee -a $LOG_FILE

# Pull changes
git pull origin main

# Load environment
source .env

# Build and deploy
log "🔨 Building new images..."
docker-compose -f $COMPOSE_FILE build --no-cache 2>&1 | tee -a $LOG_FILE

log "🚀 Restarting services..."
docker-compose -f $COMPOSE_FILE up -d 2>&1 | tee -a $LOG_FILE

# Wait for health checks
sleep 15

# Verify deployment
for i in {1..10}; do
    if docker-compose -f $COMPOSE_FILE ps | grep -q "unhealthy"; then
        log "❌ Deployment failed - services unhealthy"
        docker-compose -f $COMPOSE_FILE logs --tail=50 2>&1 | tee -a $LOG_FILE
        exit 1
    fi

    if docker-compose -f $COMPOSE_FILE ps | grep -q "starting"; then
        log "⏳ Services starting... ($i/10)"
        sleep 3
    else
        break
    fi
done

# Run database migrations if needed
log "🗄️  Running database initialization..."
docker-compose -f $COMPOSE_FILE exec -T backend npm run db:init 2>&1 | tee -a $LOG_FILE

# Clean up
log "🧹 Cleaning up old images..."
docker image prune -f 2>&1 | tee -a $LOG_FILE

log "✅ Auto-update complete!"