@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║         🔐 SecureVault - Changer le Port                     ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0\.."

:: Vérifier si .env existe
if not exist ".env" (
    echo ❌ Fichier .env non trouvé !
    echo    Lancez d'abord l'installation : .\scripts\install.bat
    pause
    exit /b 1
)

:: Afficher le port actuel
for /f "tokens=2 delims==" %%a in ('findstr /B "FRONTEND_PORT=" .env') do set CURRENT_PORT=%%a
echo ℹ️  Port actuel : %CURRENT_PORT%
echo.

:: Demander le nouveau port
set /p NEW_PORT="Nouveau port [80/8080/3000 ou autre] : "

if "!NEW_PORT!"=="" (
    echo ❌ Aucun port spécifié
    pause
    exit /b 1
)

:: Vérifier si c'est un nombre
powershell -Command "if (![int]::TryParse('%NEW_PORT%', [ref]$null)) { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo ❌ Le port doit être un nombre valide
    pause
    exit /b 1
)

:: Calculer le port SSL
if %NEW_PORT%==80 (
    set NEW_SSL_PORT=443
) else (
    set /a NEW_SSL_PORT=%NEW_PORT%+1
)

echo.
echo 📝 Mise à jour du port vers %NEW_PORT%...

:: Mettre à jour le fichier .env
powershell -Command "
    $content = Get-Content .env -Raw
    $content = $content -replace 'FRONTEND_PORT=.*', 'FRONTEND_PORT=%NEW_PORT%'
    $content = $content -replace 'FRONTEND_SSL_PORT=.*', 'FRONTEND_SSL_PORT=%NEW_SSL_PORT%'
    $content = $content -replace 'ALLOWED_ORIGINS=.*', 'ALLOWED_ORIGINS=http://localhost:5173,http://localhost:%NEW_PORT%,http://localhost:%NEW_SSL_PORT%'
    $content | Set-Content .env -NoNewline
"

echo ✅ Configuration mise à jour
echo.
echo 🔄 Redémarrage des conteneurs...
docker compose restart

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                ✅ Port Modifié !                             ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📱 Nouvel accès : http://localhost:%NEW_PORT%

if %NEW_PORT% LSS 1024 (
    echo.
    echo ⚠️  Ce port nécessite des privilèges administrateur
echo.
)

pause
