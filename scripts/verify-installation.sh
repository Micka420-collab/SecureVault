#!/bin/bash

# Script de vérification de l'installation SecureVault Premium
# Vérifie que toutes les fonctionnalités sont correctement installées

echo "🔐 SecureVault Premium - Vérification d'installation"
echo "======================================================"
echo ""

ERRORS=0

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 (manquant: $1)"
        ((ERRORS++))
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2 (manquant: $1)"
        ((ERRORS++))
        return 1
    fi
}

echo "📁 Structure des fichiers:"
echo "---------------------------"

# Backend Services
check_file "backend/src/services/securityScore.js" "Service Security Score"
check_file "backend/src/services/versioning.js" "Service Versioning"
check_file "backend/src/services/secureShare.js" "Service Secure Share"
check_file "backend/src/services/emergencyAccess.js" "Service Emergency Access"
check_file "backend/src/services/diceware.js" "Service Diceware"

echo ""
echo "🛣️  Routes API:"
echo "----------------"
check_file "backend/src/routes/security.js" "Routes Security"

echo ""
echo "🎨 Composants Frontend:"
echo "-----------------------"
check_file "frontend/src/components/SecurityScore.jsx" "Dashboard Security Score"
check_file "frontend/src/components/CommandPalette.jsx" "Command Palette"
check_file "frontend/src/pages/Security.jsx" "Page Security"

echo ""
echo "🗄️  Base de données:"
echo "--------------------"
check_file "backend/prisma/schema.prisma" "Schema Prisma"

# Vérifier les modèles dans le schema
if grep -q "model VaultVersion" backend/prisma/schema.prisma; then
    echo -e "${GREEN}✓${NC} Model VaultVersion"
else
    echo -e "${RED}✗${NC} Model VaultVersion (manquant dans schema.prisma)"
    ((ERRORS++))
fi

if grep -q "model SecureShare" backend/prisma/schema.prisma; then
    echo -e "${GREEN}✓${NC} Model SecureShare"
else
    echo -e "${RED}✗${NC} Model SecureShare (manquant dans schema.prisma)"
    ((ERRORS++))
fi

if grep -q "model EmergencyAccess" backend/prisma/schema.prisma; then
    echo -e "${GREEN}✓${NC} Model EmergencyAccess"
else
    echo -e "${RED}✗${NC} Model EmergencyAccess (manquant dans schema.prisma)"
    ((ERRORS++))
fi

if grep -q "model AuditLog" backend/prisma/schema.prisma; then
    echo -e "${GREEN}✓${NC} Model AuditLog"
else
    echo -e "${RED}✗${NC} Model AuditLog (manquant dans schema.prisma)"
    ((ERRORS++))
fi

echo ""
echo "🔧 Configuration:"
echo "-----------------"
check_file ".env.example" "Template .env"
check_file "docker-compose.yml" "Docker Compose"

echo ""
echo "📚 Documentation:"
echo "-----------------"
check_file "README.md" "README"
check_file "SECURITY_IMPROVEMENTS.md" "Doc Améliorations"
check_file "DEPLOYMENT_CHECKLIST.md" "Checklist Déploiement"
check_file "IMPLEMENTATION_SUMMARY.md" "Résumé Implémentation"

echo ""
echo "======================================================"

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les fichiers sont présents !${NC}"
    echo ""
    echo "🚀 Prochaines étapes:"
    echo "   1. cd backend && npx prisma db push"
    echo "   2. node scripts/security-check.js"
    echo "   3. docker-compose up -d"
    echo ""
    exit 0
else
    echo -e "${RED}❌ $ERRORS fichier(s) manquant(s) ou incomplet(s)${NC}"
    echo ""
    exit 1
fi
