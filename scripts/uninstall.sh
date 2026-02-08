#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║         🔐 SecureVault - Désinstallation                     ║${NC}"
echo -e "${YELLOW}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${RED}⚠️  Cette action va arrêter et supprimer tous les conteneurs SecureVault${NC}"
echo -e "${RED}   et les volumes de données (mot de passe, documents, etc.)${NC}"
echo ""

read -p "Êtes-vous sûr ? (tapez OUI pour confirmer) : " CONFIRM

if [ "$CONFIRM" != "OUI" ]; then
    echo -e "${GREEN}❌ Opération annulée${NC}"
    exit 0
fi

cd "$(dirname "$0")/.."

# Détecter la commande compose
if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_CMD="docker-compose"
else
    COMPOSE_CMD="docker compose"
fi

echo ""
echo "🛑 Arrêt des conteneurs..."
$COMPOSE_CMD down

echo ""
echo "🗑️  Suppression des volumes (toutes les données seront perdues)..."
$COMPOSE_CMD down -v

echo ""
echo "🧹 Nettoyage des images..."
docker rmi securevault-backend securevault-frontend 2>/dev/null || true

echo ""
echo -e "${GREEN}✅ SecureVault a été complètement désinstallé${NC}"
echo ""
echo "📋 Pour réinstaller :"
echo "   ./scripts/install.sh"
echo ""
