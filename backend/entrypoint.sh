#!/bin/sh

# SecureVault Backend Entrypoint
# Attend que PostgreSQL soit prêt puis démarre l'application

set -e

echo "🔐 SecureVault Backend - Starting up..."

# Attendre que PostgreSQL soit disponible
echo "⏳ Waiting for PostgreSQL..."
until nc -z postgres 5432; do
  echo "   PostgreSQL is unavailable - sleeping"
  sleep 1
done
echo "✅ PostgreSQL is up!"

# Exécuter les migrations Prisma
echo "🔄 Running database migrations..."
npx prisma migrate deploy || npx prisma db push --accept-data-loss

# Générer le client Prisma (au cas où)
echo "🔄 Generating Prisma client..."
npx prisma generate

echo "✅ Database ready!"

# Démarrer l'application
echo "🚀 Starting SecureVault API..."
exec node src/index.js
