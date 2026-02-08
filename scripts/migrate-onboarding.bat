@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║    🎓 Migration Onboarding - Tutoriel Premier Connexion      ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0\..\backend"

echo 📦 Installation des dépendances...
call npm install

echo.
echo 🔄 Génération du client Prisma...
call npx prisma generate

echo.
echo 🗄️  Application des migrations...
call npx prisma db push

echo.
echo ✅ Migration terminée !
echo.
echo 📋 Résumé des changements :
echo    • Ajout du champ hasSeenOnboarding dans User
echo    • Création du composant Onboarding.jsx
echo    • API /auth/onboarding-seen
echo    • Tutoriel interactif avec 8 étapes
echo.
pause
