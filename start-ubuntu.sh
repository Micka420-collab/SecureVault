#!/bin/bash

# SecureVault - Start Script for Ubuntu
# By Nextendo x Micka Delcato
# Usage: ./start-ubuntu.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║   🔐 SecureVault - Password Manager & Secure Vault       ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}║            By Nextendo x Micka Delcato                   ║${NC}"
echo -e "${BLUE}║                                                          ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker n'est pas installé${NC}"
    echo "Installation de Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo -e "${YELLOW}⚠️ Déconnectez-vous et reconnectez-vous pour appliquer les changements${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose n'est pas installé${NC}"
    echo "Installation..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# Determine Docker Compose command
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

echo -e "${GREEN}✅ Docker est installé${NC}"

# Check if .env exists, create if not
if [ ! -f .env ]; then
    echo -e "${YELLOW}📄 Création du fichier .env...${NC}"
    
    # Generate secrets
    JWT_SECRET=$(openssl rand -base64 64 2>/dev/null || head -c 96 /dev/urandom | base64)
    SESSION_SECRET=$(openssl rand -base64 64 2>/dev/null || head -c 96 /dev/urandom | base64)
    REAL_EMAIL_ENCRYPTION_KEY=$(openssl rand -base64 32 2>/dev/null || head -c 48 /dev/urandom | base64)
    DB_PASSWORD=$(openssl rand -base64 32 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -d "=+/" | cut -c1-32)
    
    cat > .env << EOF
# SecureVault Environment Configuration
# Generated automatically on $(date)

# Database Configuration
DB_USER=vault
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=securevault
DATABASE_URL=postgresql://vault:${DB_PASSWORD}@postgres:5432/securevault

# Security Keys
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
REAL_EMAIL_ENCRYPTION_KEY=${REAL_EMAIL_ENCRYPTION_KEY}

# Email Configuration (optional)
MAIL_DOMAIN=localhost
SMTP_HOST=mail
SMTP_PORT=587

# Frontend Configuration - NO SSL
VITE_API_URL=http://localhost:3001
FRONTEND_PORT=8080

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:8080,http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Document Uploads
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=524288000

# Environment
NODE_ENV=production
SECURE_COOKIES=false
TRUST_PROXY=false
EOF
    
    echo -e "${GREEN}✅ Fichier .env créé avec des secrets auto-générés${NC}"
else
    echo -e "${GREEN}✅ Fichier .env existe déjà${NC}"
fi

# Create docker-compose override without SSL
cat > docker-compose.override.yml << 'EOF'
# Override for local development without SSL
version: '3.8'

services:
  frontend:
    ports:
      - "${FRONTEND_PORT:-8080}:80"
    # Pas de port SSL
EOF

echo -e "${BLUE}🚀 Démarrage de SecureVault...${NC}"
echo ""

# Build and start services
echo -e "${YELLOW}🏗️  Construction et démarrage des services...${NC}"
$COMPOSE_CMD up --build -d

echo ""
echo -e "${BLUE}⏳ Attente du démarrage des services...${NC}"

# Wait for database
echo -n "   Waiting for database..."
for i in {1..60}; do
    if $COMPOSE_CMD exec -T postgres pg_isready -U vault -d securevault &>/dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 1
    if [ $i -eq 60 ]; then
        echo -e " ${RED}❌ Timeout${NC}"
        exit 1
    fi
done

# Wait for backend
echo -n "   Waiting for backend..."
for i in {1..60}; do
    if curl -s http://localhost:3001/api/health &>/dev/null 2>&1; then
        echo -e " ${GREEN}✅${NC}"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 60 ]; then
        echo -e " ${RED}❌ Timeout${NC}"
        echo ""
        echo -e "${YELLOW}📋 Logs du backend :${NC}"
        $COMPOSE_CMD logs backend --tail=50
        exit 1
    fi
done

echo ""
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  🎉 SecureVault est démarré avec succès !               ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📱 ${BLUE}Accès à l'application :${NC}"
echo ""
echo -e "   ➤ Interface Web   : ${GREEN}http://localhost:8080${NC}"
echo -e "   ➤ API Backend     : ${GREEN}http://localhost:3001${NC}"
echo ""
echo -e "🔧 ${BLUE}Commandes utiles :${NC}"
echo ""
echo "   # Voir les logs"
echo -e "   ${YELLOW}$COMPOSE_CMD logs -f${NC}"
echo ""
echo "   # Arrêter les services"
echo -e "   ${YELLOW}$COMPOSE_CMD down${NC}"
echo ""
echo "   # Redémarrer"
echo -e "   ${YELLOW}$COMPOSE_CMD restart${NC}"
echo ""
echo -e "⚠️  ${YELLOW}Important :${NC}"
echo "   - Votre mot de passe maître n'est JAMAIS stocké sur le serveur"
echo "   - Si vous l'oubliez, vos données sont irrécupérables"
echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
