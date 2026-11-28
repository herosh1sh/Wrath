#!/bin/bash

# Wrath Backup Script
# Creates a backup of the database and uploads

set -e

PROJECT_DIR="/opt/wrath"
BACKUP_DIR="/opt/wrath/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="wrath_backup_$DATE"

echo "🗄️  Starting backup: $BACKUP_NAME"

mkdir -p $BACKUP_DIR

# Backup database
echo "📦 Backing up database..."
docker-compose -f $PROJECT_DIR/docker-compose.yml exec -T backend sqlite3 /app/data/wrath.db .dump > $BACKUP_DIR/${BACKUP_NAME}.sql

# Backup uploads
echo "📁 Backing up uploads..."
tar -czf $BACKUP_DIR/${BACKUP_NAME}_uploads.tar.gz -C $PROJECT_DIR/wrath-uploads .

# Create combined archive
echo "📦 Creating combined archive..."
tar -czf $BACKUP_DIR/${BACKUP_NAME}.tar.gz -C $BACKUP_DIR ${BACKUP_NAME}.sql ${BACKUP_NAME}_uploads.tar.gz

# Clean up individual files
rm $BACKUP_DIR/${BACKUP_NAME}.sql $BACKUP_DIR/${BACKUP_NAME}_uploads.tar.gz

# Keep only last 30 backups
echo "🧹 Cleaning old backups..."
ls -t $BACKUP_DIR/wrath_backup_*.tar.gz | tail -n +31 | xargs -r rm

echo "✅ Backup complete: $BACKUP_DIR/${BACKUP_NAME}.tar.gz"
echo "📊 Backup size: $(du -h $BACKUP_DIR/${BACKUP_NAME}.tar.gz | cut -f1)"