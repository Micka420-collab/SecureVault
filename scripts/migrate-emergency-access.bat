@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║  🔐 Migration Emergency Access - Améliorations de sécurité   ║
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
echo    • Vérification existence du contact
echo    • Expiration post-confirmation (7j par défaut)
echo    • Audit log détaillé
echo    • Relations User-EmergencyAccess
echo.
pause
