#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Security Check Script - SecureVault by Nextendo x Micka Delcato
# Vérifications de sécurité avant déploiement
# ═══════════════════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

echo "🔒 SecureVault Security Check"
echo "=============================="
echo ""

# 1. Vérifier les secrets faibles
echo -n "🔐 Vérification des secrets... "
if grep -r "CHANGE_ME\|password123\|secret123\|your_\|admin123" .env* backend/.env frontend/.env 2>/dev/null; then
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Secrets faibles ou par défaut détectés!"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ PASS${NC}"
fi

# 2. Vérifier SQLite en production
echo -n "🗄️  Vérification base de données... "
if [ "$NODE_ENV" = "production" ]; then
    if grep -q "sqlite" backend/prisma/schema.prisma 2>/dev/null; then
        echo -e "${RED}❌ FAIL${NC}"
        echo "   SQLite détecté en production! Utilisez PostgreSQL."
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ PASS${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  SKIP${NC} (NODE_ENV != production)"
fi

# 3. Vérifier les clés privées exposées
echo -n "🔑 Vérification des clés privées... "
KEY_FILES=$(find . -name "*.pem" -o -name "*.key" -o -name "*.p12" 2>/dev/null | grep -v node_modules | grep -v ".git" | wc -l)
if [ "$KEY_FILES" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  WARN${NC}"
    echo "   $KEY_FILES fichier(s) clé trouvé(s):"
    find . -name "*.pem" -o -name "*.key" -o -name "*.p12" 2>/dev/null | grep -v node_modules | grep -v ".git" | head -5
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ PASS${NC}"
fi

# 4. Vérifier les dépendances vulnérables
echo -n "📦 Vérification des dépendances... "
cd backend
if npm audit --audit-level=high 2>/dev/null | grep -q "found.*vulnerabilities"; then
    echo -e "${YELLOW}⚠️  WARN${NC}"
    echo "   Vulnérabilités détectées dans les dépendances:"
    npm audit --audit-level=high 2>/dev/null | head -10
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ PASS${NC}"
fi
cd ..

# 5. Vérifier les variables d'environnement
echo -n "🔧 Vérification des variables d'environnement... "
if [ -f ".env" ]; then
    # Vérifier que les variables sensibles ne sont pas vides
    if grep -E "^JWT_SECRET=\s*$" .env >/dev/null 2>&1 || \
       grep -E "^SESSION_SECRET=\s*$" .env >/dev/null 2>&1 || \
       grep -E "^DB_PASSWORD=\s*$" .env >/dev/null 2>&1; then
        echo -e "${RED}❌ FAIL${NC}"
        echo "   Variables sensibles vides dans .env!"
        ((ERRORS++))
    else
        echo -e "${GREEN}✅ PASS${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  WARN${NC}"
    echo "   Fichier .env non trouvé"
    ((WARNINGS++))
fi

# 6. Vérifier les permissions des fichiers
echo -n "📁 Vérification des permissions... "
if [ -f ".env" ] && [ "$(stat -c %a .env 2>/dev/null || stat -f %Lp .env 2>/dev/null)" != "600" ]; then
    echo -e "${YELLOW}⚠️  WARN${NC}"
    echo "   Le fichier .env devrait avoir des permissions 600"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ PASS${NC}"
fi

# Résumé
echo ""
echo "=============================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Tous les contrôles sont passés!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS avertissement(s) à vérifier${NC}"
    exit 0
else
    echo -e "${RED}❌ $ERRORS erreur(s) critique(s) détectée(s)${NC}"
    echo -e "${YELLOW}⚠️  $WARNINGS avertissement(s)${NC}"
    exit 1
fi
