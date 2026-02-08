#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         🔐 SecureVault - Changer le Port                     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$(dirname "$0")/.."

# Vérifier si .env existe
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Fichier .env non trouvé !${NC}"
    echo "   Lancez d'abord l'installation : ./scripts/install.sh"
    exit 1
fi

# Afficher le port actuel
CURRENT_PORT=$(grep "^FRONTEND_PORT=" .env | cut -d'=' -f2)
echo -e "${CYAN}ℹ️  Port actuel : ${CURRENT_PORT}${NC}"
echo ""

# Demander le nouveau port
read -p "Nouveau port [80/8080/3000 ou autre] : " NEW_PORT

if [ -z "$NEW_PORT" ]; then
    echo -e "${RED}❌ Aucun port spécifié${NC}"
    exit 1
fi

# Vérifier si c'est un nombre
if ! [[ "$NEW_PORT" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Le port doit être un nombre valide${NC}"
    exit 1
fi

# Calculer le port SSL
if [ "$NEW_PORT" -eq 80 ]; then
    NEW_SSL_PORT=443
else
    NEW_SSL_PORT=$((NEW_PORT + 1))
fi

echo ""
echo "📝 Mise à jour du port vers ${NEW_PORT}..."

# Mettre à jour le fichier .env
sed -i.bak "s/^FRONTEND_PORT=.*/FRONTEND_PORT=${NEW_PORT}/" .env
sed -i.bak "s/^FRONTEND_SSL_PORT=.*/FRONTEND_SSL_PORT=${NEW_SSL_PORT}/" .env
sed -i.bak "s/^ALLOWED_ORIGINS=.*/ALLOWED_ORIGINS=http:\/\/localhost:5173,http:\/\/localhost:${NEW_PORT},http:\/\/localhost:${NEW_SSL_PORT}/" .env
rm -f .env.bak

echo -e "${GREEN}✅ Configuration mise à jour${NC}"
echo ""
echo "🔄 Redémarrage des conteneurs..."

# Détecter la commande compose
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

$COMPOSE_CMD restart

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                ✅ Port Modifié !                             ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📱 Nouvel accès : http://localhost:${NEW_PORT}${NC}"

if [ "$NEW_PORT" -lt 1024 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  Ce port nécessite des privilèges administrateur${NC}"
fi

echo ""
