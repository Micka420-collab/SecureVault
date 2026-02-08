#!/bin/bash

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║          🔐 SecureVault - Installation Automatique           ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# ========================================
# Vérification de Docker
# ========================================
if ! command_exists docker; then
    echo -e "${RED}❌ Docker n'est pas installé !${NC}"
    echo ""
    echo "📥 Veuillez installer Docker :"
    echo "   https://docs.docker.com/get-docker/"
    echo ""
    exit 1
fi
echo -e "${GREEN}✅ Docker est installé${NC}"

# Vérifier si Docker Compose est disponible
if command_exists docker-compose; then
    COMPOSE_CMD="docker-compose"
elif docker compose version >/dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    echo -e "${RED}❌ Docker Compose n'est pas installé !${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker Compose est installé${NC}"

# Se placer dans le dossier racine du projet
cd "$(dirname "$0")/.."

# ========================================
# Choix du port HTTP
# ========================================
echo ""
echo -e "${CYAN}🔧 Configuration du port d'accès :${NC}"
echo "   Le port par défaut est 80 (nécessite des privilèges root)"
echo "   Pour une sécurité accrue, utilisez un port non privilégié comme 8080 ou 3000"
echo ""

read -p "Choisissez le port HTTP [80/8080/3000 ou autre] (défaut: 8080): " PORT_CHOICE

# Définir le port par défaut
if [ -z "$PORT_CHOICE" ]; then
    FRONTEND_PORT=8080
else
    # Vérifier si c'est un nombre
    if ! [[ "$PORT_CHOICE" =~ ^[0-9]+$ ]]; then
        echo -e "${RED}❌ Le port doit être un nombre valide${NC}"
        exit 1
    fi
    
    # Vérifier la plage
    if [ "$PORT_CHOICE" -lt 1 ] || [ "$PORT_CHOICE" -gt 65535 ]; then
        echo -e "${RED}❌ Le port doit être entre 1 et 65535${NC}"
        exit 1
    fi
    
    FRONTEND_PORT=$PORT_CHOICE
fi

# Déterminer le port SSL
if [ "$FRONTEND_PORT" -eq 80 ]; then
    FRONTEND_SSL_PORT=443
else
    FRONTEND_SSL_PORT=$((FRONTEND_PORT + 1))
fi

echo ""
echo -e "${CYAN}ℹ️  Port HTTP configuré : ${FRONTEND_PORT}${NC}"
echo -e "${CYAN}ℹ️  Port HTTPS configuré : ${FRONTEND_SSL_PORT}${NC}"

# ========================================
# Création du fichier .env
# ========================================
echo ""
if [ ! -f ".env" ]; then
    echo "📝 Création du fichier de configuration .env..."
    
    # Générer des secrets aléatoires
    if command_exists openssl; then
        JWT_SECRET=$(openssl rand -base64 32)
        SESSION_SECRET=$(openssl rand -base64 32)
        EMAIL_KEY=$(openssl rand -base64 32)
        DB_PASSWORD="vault_secure_$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)"
    else
        JWT_SECRET=$(head -c 32 /dev/urandom | base64)
        SESSION_SECRET=$(head -c 32 /dev/urandom | base64)
        EMAIL_KEY=$(head -c 32 /dev/urandom | base64)
        DB_PASSWORD="vault_secure_$(head -c 16 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 16)"
    fi
    
    # Créer le fichier .env
    cat > .env << EOF
# ==========================================
# SecureVault - Configuration Auto-Générée
# ==========================================

# Database Configuration
DB_USER=vault
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=securevault

# Security Keys (Auto-générées)
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}

# Email Configuration
MAIL_DOMAIN=localhost
REAL_EMAIL_ENCRYPTION_KEY=${EMAIL_KEY}

# Frontend Configuration
VITE_API_URL=http://localhost:3001

# HTTP Port (default: 80, use 8080 or 3000 for non-root security)
FRONTEND_PORT=${FRONTEND_PORT}

# HTTPS Port (default: 443)
FRONTEND_SSL_PORT=${FRONTEND_SSL_PORT}

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:${FRONTEND_PORT},http://localhost:${FRONTEND_SSL_PORT}

# Upload Configuration
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=524288000
EOF
    
    echo -e "${GREEN}✅ Fichier .env créé avec des secrets auto-générés${NC}"
else
    echo -e "${YELLOW}ℹ️  Fichier .env existe déjà${NC}"
    echo "    Mise à jour du port vers ${FRONTEND_PORT}..."
    
    # Mettre à jour les ports dans le fichier existant
    sed -i.bak "s/^FRONTEND_PORT=.*/FRONTEND_PORT=${FRONTEND_PORT}/" .env
    sed -i.bak "s/^FRONTEND_SSL_PORT=.*/FRONTEND_SSL_PORT=${FRONTEND_SSL_PORT}/" .env
    rm -f .env.bak
    
    echo -e "${GREEN}✅ Port mis à jour dans .env${NC}"
fi

# ========================================
# Démarrage Docker
# ========================================
echo ""
echo "🐳 Construction et démarrage des conteneurs Docker..."
echo "   Cette opération peut prendre quelques minutes la première fois..."
echo ""

# Lancer Docker Compose
$COMPOSE_CMD up -d --build

echo ""
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le health check
echo ""
echo "🔍 Vérification de l'installation..."
if curl -s http://localhost:3001/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ API démarrée avec succès !${NC}"
    VERSION=$(curl -s http://localhost:3001/api/health | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
    echo "   Version: $VERSION"
else
    echo -e "${YELLOW}⚠️  API non encore prête, patientez quelques secondes...${NC}"
fi

# ========================================
# Message de fin
# ========================================
echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                🎉 Installation Terminée !                    ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📱 Accès à l'application :${NC}"
echo "   • Frontend : http://localhost:${FRONTEND_PORT}"

if [ "$FRONTEND_PORT" -eq 80 ]; then
    echo "                 http://localhost"
fi

echo "   • API      : http://localhost:3001"
echo ""

if [ "$FRONTEND_PORT" -lt 1024 ]; then
    echo -e "${YELLOW}⚠️  NOTE : Le port ${FRONTEND_PORT} est un port privilégié${NC}"
    echo -e "${YELLOW}    Sur Linux/Mac, assurez-vous d'avoir les droits root${NC}"
    echo ""
fi

echo -e "${BLUE}🔧 Commandes utiles :${NC}"
echo "   • Voir les logs : $COMPOSE_CMD logs -f"
echo "   • Arrêter       : $COMPOSE_CMD down"
echo "   • Redémarrer    : $COMPOSE_CMD restart"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT : Changez le mot de passe maître lors de la première connexion !${NC}"
echo ""
