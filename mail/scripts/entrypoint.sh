#!/bin/sh

# SecureVault Mail Server Entrypoint Script

set -e

echo "🔐 SecureVault Mail Server Starting..."

# Replace environment variables in Postfix config
if [ -n "$MAIL_DOMAIN" ]; then
    sed -i "s/\$MAIL_DOMAIN/$MAIL_DOMAIN/g" /etc/postfix/main.cf
    echo "✅ Mail domain set to: $MAIL_DOMAIN"
fi

# Update PostgreSQL connection settings from DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
    # Parse DATABASE_URL: postgresql://user:password@host:port/database
    DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    
    sed -i "s/user = vault/user = $DB_USER/g" /etc/postfix/pgsql-virtual-mailbox-maps.cf
    sed -i "s/password = vault_secure_password/password = $DB_PASS/g" /etc/postfix/pgsql-virtual-mailbox-maps.cf
    sed -i "s/hosts = postgres/hosts = $DB_HOST/g" /etc/postfix/pgsql-virtual-mailbox-maps.cf
    sed -i "s/dbname = securevault/dbname = $DB_NAME/g" /etc/postfix/pgsql-virtual-mailbox-maps.cf
    
    echo "✅ Database connection configured"
fi

# Generate self-signed certificate if none exists
if [ ! -f /etc/postfix/ssl/fullchain.pem ]; then
    echo "⚠️ No SSL certificate found, generating self-signed..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/postfix/ssl/privkey.pem \
        -out /etc/postfix/ssl/fullchain.pem \
        -subj "/CN=${MAIL_DOMAIN:-localhost}"
    echo "✅ Self-signed certificate generated"
fi

# Fix permissions
chown -R postfix:postfix /var/spool/postfix
postfix set-permissions

# Create mail directories
mkdir -p /var/mail/vhosts
chown -R postfix:postfix /var/mail

echo "🚀 Starting Postfix..."
exec "$@"
