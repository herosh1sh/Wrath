#!/bin/bash

# Wrath Deployment Script
# Usage: ./scripts/deploy.sh [production|staging]

set -e

ENVIRONMENT=${1:-production}
PROJECT_DIR="/opt/wrath"
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Deploying Wrath to $ENVIRONMENT..."

# Check if running as root or with sudo
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root or with sudo"
   exit 1
fi

# Create project directory if it doesn't exist
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
if [ -d ".git" ]; then
    git fetch origin
    git reset --hard origin/main
else
    git clone https://github.com/yourusername/wrath.git .
fi

# Copy environment file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from example..."
    cp .env.example .env
    echo "📝 Please edit .env with your configuration!"
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$JWT_SECRET" ] || [ "$JWT_SECRET" = "your-super-secret-jwt-key-change-in-production-min-32-chars" ]; then
    echo "❌ JWT_SECRET not set in .env"
    exit 1
fi

# Create SSL directory if using custom certs
mkdir -p nginx/ssl

# Check for SSL certificates
if [ ! -f "nginx/ssl/wrath.heroshish.ru.crt" ] || [ ! -f "nginx/ssl/wrath.heroshish.ru.key" ]; then
    echo "⚠️  SSL certificates not found in nginx/ssl/"
    echo "   Please place your reg.ru certificates there:"
    echo "   - nginx/ssl/wrath.heroshish.ru.crt"
    echo "   - nginx/ssl/wrath.heroshish.ru.key"
    echo ""
    echo "   Or use Let's Encrypt by running:"
    echo "   docker-compose run --rm certbot certonly --webroot -w /var/www/certbot -d wrath.heroshish.ru"
    exit 1
fi

# Build and start containers
echo "🔨 Building and starting containers..."
docker-compose -f $COMPOSE_FILE pull
docker-compose -f $COMPOSE_FILE build --no-cache
docker-compose -f $COMPOSE_FILE up -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be healthy..."
sleep 10

# Check health
for i in {1..30}; do
    if docker-compose -f $COMPOSE_FILE ps | grep -q "unhealthy"; then
        echo "❌ Some services are unhealthy"
        docker-compose -f $COMPOSE_FILE logs --tail=50
        exit 1
    fi

    if docker-compose -f $COMPOSE_FILE ps | grep -q "starting"; then
        echo "⏳ Services still starting... ($i/30)"
        sleep 2
    else
        break
    fi
done

# Run database migrations (if any)
echo "🗄️  Running database initialization..."
docker-compose -f $COMPOSE_FILE exec -T backend npm run db:init

# Clean up old images
echo "🧹 Cleaning up old Docker images..."
docker image prune -f

echo "✅ Deployment complete!"
echo "🌐 Wrath is now running at https://wrath.heroshish.ru"
echo ""
echo "📋 Useful commands:"
echo "   View logs:     docker-compose logs -f"
echo "   Stop:          docker-compose down"
echo "   Restart:       docker-compose restart"
echo "   Update:        ./scripts/deploy.sh"
echo "   Backup DB:     ./scripts/backup.sh"