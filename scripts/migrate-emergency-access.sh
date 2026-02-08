#!/bin/bash

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔐 Migration Emergency Access - Améliorations de sécurité   ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$(dirname "$0")/../backend"

echo "📦 Installation des dépendances..."
npm install

echo ""
echo "🔄 Génération du client Prisma..."
npx prisma generate

echo ""
echo "🗄️  Application des migrations..."
npx prisma db push

echo ""
echo -e "${GREEN}✅ Migration terminée !${NC}"
echo ""
echo "📋 Résumé des changements :"
echo "   • Vérification existence du contact"
echo "   • Expiration post-confirmation (7j par défaut)"
echo "   • Audit log détaillé"
echo "   • Relations User-EmergencyAccess"
echo ""
