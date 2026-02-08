#!/bin/bash

# SecureVault - Test Mode Offline
# Vérifie que l'application fonctionne sans connexion Internet

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     🔒 SecureVault - Test Mode 100% Offline             ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""

ERRORS=0

# Test 1: Vérifier que les fichiers sources n'ont pas d'appels externes
echo -e "${BLUE}Test 1: Vérification des appels externes dans le code...${NC}"

# Vérifier les URLs suspectes dans le frontend
if grep -r "google\.com\|pwnedpasswords\|cdnjs\|jsdelivr\|unpkg" frontend/src/ --include="*.js" --include="*.jsx" 2>/dev/null | grep -v "node_modules"; then
    echo -e "${RED}❌ Appels externes trouvés dans le frontend!${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Aucun appel externe dans le frontend${NC}"
fi

# Test 2: Vérifier le CSP dans index.html
echo -e "${BLUE}Test 2: Vérification du Content Security Policy...${NC}"
if grep -q "connect-src 'self'" frontend/index.html; then
    echo -e "${GREEN}✅ CSP configuré pour localhost uniquement${NC}"
else
    echo -e "${RED}❌ CSP incorrect!${NC}"
    ((ERRORS++))
fi

# Test 3: Vérifier que les favicons sont locales
echo -e "${BLUE}Test 3: Vérification des favicons...${NC}"
if grep -q "google.com/s2/favicons" frontend/src/pages/Vault.jsx; then
    echo -e "${RED}❌ Favicons Google trouvés!${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Favicons locales (pas d'appel Google)${NC}"
fi

# Test 4: Vérifier la vérification de mot de passe offline
echo -e "${BLUE}Test 4: Vérification du password check offline...${NC}"
if grep -q "api.pwnedpasswords.com" frontend/src/hooks/usePasswordCheck.js; then
    echo -e "${RED}❌ Have I Been Pwned API trouvée!${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Vérification offline uniquement${NC}"
fi

# Test 5: Vérifier le docker-compose (pas de services externes)
echo -e "${BLUE}Test 5: Vérification de docker-compose.yml...${NC}"
if grep -q "image:" docker-compose.yml | grep -v "postgres\|nginx\|node"; then
    echo -e "${YELLOW}⚠️  Images Docker externes détectées (normales pour PostgreSQL/Nginx)${NC}"
else
    echo -e "${GREEN}✅ Configuration Docker standard${NC}"
fi

# Test 6: Vérifier les variables d'environnement
echo -e "${BLUE}Test 6: Vérification de la configuration...${NC}"
if [ -f .env ]; then
    if grep -q "VITE_API_URL=http://localhost:3001" .env; then
        echo -e "${GREEN}✅ Configuration API locale${NC}"
    else
        echo -e "${YELLOW}⚠️  Vérifiez VITE_API_URL dans .env${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Fichier .env manquant (sera créé au démarrage)${NC}"
fi

echo ""

# Résumé
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ Tous les tests offline sont passés !                ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "L'application est prête pour une utilisation 100% offline."
    echo "Vous pouvez déconnecter Internet et démarrer avec :"
    echo -e "${YELLOW}  ./start-ubuntu.sh${NC}"
    exit 0
else
    echo -e "${RED}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ $ERRORS erreur(s) trouvée(s)                          ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Corrigez les erreurs avant de continuer."
    exit 1
fi
