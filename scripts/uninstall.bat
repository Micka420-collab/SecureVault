@echo off
chcp 65001 >nul
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         🔐 SecureVault - Désinstallation                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo ⚠️  Cette action va arrêter et supprimer tous les conteneurs SecureVault
echo    et les volumes de données (mot de passe, documents, etc.)
echo.
set /p CONFIRM="Êtes-vous sûr ? (tapez OUI pour confirmer) : "

if /I not "%CONFIRM%"=="OUI" (
    echo ❌ Opération annulée
    pause
    exit /b 0
)

cd /d "%~dp0\.."

echo.
echo 🛑 Arrêt des conteneurs...
docker compose down

echo.
echo 🗑️  Suppression des volumes (toutes les données seront perdues)...
docker compose down -v

echo.
echo 🧹 Nettoyage des images...
docker rmi securevault-backend securevault-frontend 2>nul

echo.
echo ✅ SecureVault a été complètement désinstallé
echo.
echo 📋 Pour réinstaller :
echo    .\scripts\install.bat
echo.
pause
