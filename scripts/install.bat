@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          🔐 SecureVault - Installation Automatique           ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

:: Vérifier si Docker est installé
docker --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker n'est pas installé !
    echo.
    echo 📥 Veuillez installer Docker Desktop :
    echo    https://www.docker.com/products/docker-desktop
    echo.
    pause
    exit /b 1
)
echo ✅ Docker est installé

:: Vérifier si Docker Compose est disponible
docker compose version >nul 2>&1
if errorlevel 1 (
    docker-compose --version >nul 2>&1
    if errorlevel 1 (
        echo ❌ Docker Compose n'est pas installé !
        pause
        exit /b 1
    )
)
echo ✅ Docker Compose est installé

:: Se placer dans le dossier parent (racine du projet)
cd /d "%~dp0\.."

:: ========================================
:: Choix du port HTTP
:: ========================================
echo.
echo 🔧 Configuration du port d'accès :
echo    Le port par défaut est 80 (nécessite des privilèges administrateur)
echo    Pour une sécurité accrue, utilisez un port non privilégié comme 8080 ou 3000
echo.
set /p PORT_CHOICE="Choisissez le port HTTP [80/8080/3000 ou autre] (défaut: 80) : "

if "!PORT_CHOICE!"=="" set PORT_CHOICE=80

:: Vérifier si le port est un nombre
powershell -Command "if (![int]::TryParse('%PORT_CHOICE%', [ref]$null)) { exit 1 }" >nul 2>&1
if errorlevel 1 (
    echo ❌ Le port doit être un nombre valide
    pause
    exit /b 1
)

:: Vérifier si le port est dans la plage valide
if %PORT_CHOICE% LSS 1 (
    echo ❌ Le port doit être supérieur à 0
    pause
    exit /b 1
)
if %PORT_CHOICE% GTR 65535 (
    echo ❌ Le port doit être inférieur à 65536
    pause
    exit /b 1
)

set FRONTEND_PORT=%PORT_CHOICE%

:: Déterminer le port SSL (HTTPS)
if %FRONTEND_PORT%==80 (
    set FRONTEND_SSL_PORT=443
) else (
    set /a FRONTEND_SSL_PORT=%FRONTEND_PORT%+1
)

echo.
echo ℹ️  Port HTTP configuré : %FRONTEND_PORT%
echo ℹ️  Port HTTPS configuré : %FRONTEND_SSL_PORT%

:: ========================================
:: Création du fichier .env
:: ========================================
echo.
if not exist ".env" (
    echo 📝 Création du fichier de configuration .env...
    
    :: Générer des secrets aléatoires
    for /f "tokens=*" %%a in ('powershell -Command "[Convert]::ToBase64String([byte[]](Get-Random -Count 32 -Minimum 0 -Maximum 256))"') do set JWT_SECRET=%%a
    for /f "tokens=*" %%a in ('powershell -Command "[Convert]::ToBase64String([byte[]](Get-Random -Count 32 -Minimum 0 -Maximum 256))"') do set SESSION_SECRET=%%a
    for /f "tokens=*" %%a in ('powershell -Command "[Convert]::ToBase64String([byte[]](Get-Random -Count 32 -Minimum 0 -Maximum 256))"') do set EMAIL_KEY=%%a
    
    :: Créer le fichier .env
    (
        echo # ==========================================
        echo # SecureVault - Configuration Auto-Générée
        echo # ==========================================
        echo.
        echo # Database Configuration
        echo DB_USER=vault
        echo DB_PASSWORD=vault_secure_%RANDOM%%RANDOM%
        echo DB_NAME=securevault
        echo.
        echo # Security Keys ^(Auto-générées^)
        echo JWT_SECRET=!JWT_SECRET!
        echo SESSION_SECRET=!SESSION_SECRET!
        echo.
        echo # Email Configuration
        echo MAIL_DOMAIN=localhost
        echo REAL_EMAIL_ENCRYPTION_KEY=!EMAIL_KEY!
        echo.
        echo # Frontend Configuration
        echo VITE_API_URL=http://localhost:3001
        echo.
        echo # HTTP Port (default: 80, use 8080 or 3000 for non-root security)
        echo FRONTEND_PORT=%FRONTEND_PORT%
        echo.
        echo # HTTPS Port (default: 443)
        echo FRONTEND_SSL_PORT=%FRONTEND_SSL_PORT%
        echo.
        echo # CORS Configuration
        echo ALLOWED_ORIGINS=http://localhost:5173,http://localhost:%FRONTEND_PORT%,http://localhost:%FRONTEND_SSL_PORT%
        echo.
        echo # Upload Configuration
        echo UPLOAD_DIR=./uploads
        echo MAX_FILE_SIZE=524288000
    ) > .env
    
    echo ✅ Fichier .env créé avec des secrets auto-générés
) else (
    echo ℹ️  Fichier .env existe déjà
    echo    Mise à jour du port vers %FRONTEND_PORT%...
    
    powershell -Command "
        $content = Get-Content .env -Raw
        $content = $content -replace 'FRONTEND_PORT=.*', 'FRONTEND_PORT=%FRONTEND_PORT%'
        $content = $content -replace 'FRONTEND_SSL_PORT=.*', 'FRONTEND_SSL_PORT=%FRONTEND_SSL_PORT%'
        $content | Set-Content .env -NoNewline
    "
    
    echo ✅ Port mis à jour dans .env
)

:: ========================================
:: Démarrage Docker
:: ========================================
echo.
echo 🐳 Construction et démarrage des conteneurs Docker...
echo    Cette opération peut prendre quelques minutes la première fois...
echo.

:: Lancer Docker Compose
docker compose up -d --build

if errorlevel 1 (
    echo.
    echo ❌ Erreur lors du démarrage de Docker Compose
    echo    Vérifiez que Docker Desktop est en cours d'exécution
    pause
    exit /b 1
)

:: Attendre que les services démarrent
echo.
echo ⏳ Attente du démarrage des services...
timeout /t 10 /nobreak >nul

:: Vérifier le health check
echo.
echo 🔍 Vérification de l'installation...
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:3001/api/health' -TimeoutSec 10; Write-Host '✅ API démarrée avec succès !' -ForegroundColor Green; Write-Host ('   Version: ' + $r.version) } catch { Write-Host '⚠️  API non encore prête, patientez quelques secondes...' -ForegroundColor Yellow }"

:: ========================================
:: Message de fin
:: ========================================
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                🎉 Installation Terminée !                    ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo 📱 Accès à l'application :
echo    • Frontend : http://localhost:%FRONTEND_PORT%

if %FRONTEND_PORT%==80 (
    echo                 http://localhost
)

echo    • API      : http://localhost:3001
echo.

if %FRONTEND_PORT% LSS 1024 (
    echo ⚠️  NOTE : Le port %FRONTEND_PORT% est un port privilégié
echo    Sur Linux/Mac, lancez avec sudo ou configurez un port ^> 1024
echo.
)

echo 🔧 Commandes utiles :
echo    • Voir les logs  : docker compose logs -f
echo    • Arrêter       : docker compose down
echo    • Redémarrer    : docker compose restart
echo.
echo ⚠️  IMPORTANT : Changez le mot de passe maître lors de la première connexion !
echo.
pause
