#!/bin/bash

# SecureVault - Check and Fix Script
# Vérifie et corrige les problèmes courants avant le démarrage

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Vérification de SecureVault...${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Check 1: Fichier .env
echo -n "✓ Fichier .env existe... "
if [ -f .env ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}MANQUANT${NC} (sera créé au démarrage)"
    ((WARNINGS++))
fi

# Check 2: Docker
echo -n "✓ Docker installé... "
if command -v docker &> /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}NON${NC}"
    ((ERRORS++))
fi

# Check 3: Docker Compose
echo -n "✓ Docker Compose installé... "
if docker compose version &> /dev/null || docker-compose version &> /dev/null; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}NON${NC}"
    ((ERRORS++))
fi

# Check 4: Backend package.json
echo -n "✓ Backend package.json... "
if [ -f backend/package.json ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MANQUANT${NC}"
    ((ERRORS++))
fi

# Check 5: Frontend package.json
echo -n "✓ Frontend package.json... "
if [ -f frontend/package.json ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MANQUANT${NC}"
    ((ERRORS++))
fi

# Check 6: Prisma schema
echo -n "✓ Prisma schema... "
if [ -f backend/prisma/schema.prisma ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MANQUANT${NC}"
    ((ERRORS++))
fi

# Check 7: Docker Compose file
echo -n "✓ docker-compose.yml... "
if [ -f docker-compose.yml ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MANQUANT${NC}"
    ((ERRORS++))
fi

# Check 8: Backend entrypoint
echo -n "✓ Backend entrypoint.sh... "
if [ -f backend/entrypoint.sh ]; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${RED}MANQUANT${NC}"
    ((ERRORS++))
fi

# Check 9: Ports disponibles
echo -n "✓ Port 8080 disponible... "
if ! netstat -tuln 2>/dev/null | grep -q ':8080 '; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}OCCUPÉ${NC}"
    ((WARNINGS++))
fi

echo -n "✓ Port 3001 disponible... "
if ! netstat -tuln 2>/dev/null | grep -q ':3001 '; then
    echo -e "${GREEN}OK${NC}"
else
    echo -e "${YELLOW}OCCUPÉ${NC}"
    ((WARNINGS++))
fi

# Check 10: Espace disque
echo -n "✓ Espace disque... "
AVAILABLE=$(df . | tail -1 | awk '{print $4}')
if [ $AVAILABLE -gt 1048576 ]; then  # 1GB = 1048576 KB
    echo -e "${GREEN}OK${NC} ($(($AVAILABLE / 1024 / 1024))GB disponible)"
else
    echo -e "${YELLOW}FAIBLE${NC} ($(($AVAILABLE / 1024))MB disponible)"
    ((WARNINGS++))
fi

echo ""

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ $ERRORS erreur(s) trouvée(s)${NC}"
    echo "Corrigez les erreurs avant de continuer."
    exit 1
fi

if [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS avertissement(s)${NC}"
fi

echo -e "${GREEN}✅ Toutes les vérifications essentielles sont passées !${NC}"
echo ""
echo "Pour démarrer SecureVault, exécutez:"
echo -e "${YELLOW}  ./start-ubuntu.sh${NC}"
