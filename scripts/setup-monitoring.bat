@echo off
chcp 65001 >nul
echo.
echo ╔═══════════════════════════════════════════════════════════════════════════╗
echo ║         📊 SecureVault Monitoring Setup - by nextendo                     ║
echo ╚═══════════════════════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0\.."

echo 🔧 Configuration du monitoring Prometheus + Grafana...
echo.

:: Vérifier Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker n'est pas installé !
    pause
    exit /b 1
)

:: Créer les dossiers nécessaires
echo 📁 Création de la structure...
if not exist "monitoring" mkdir monitoring
if not exist "monitoring\grafana\dashboards" mkdir "monitoring\grafana\dashboards"
if not exist "monitoring\grafana\datasources" mkdir "monitoring\grafana\datasources"

echo.
echo 🐳 Démarrage des services de monitoring...
docker compose -f docker-compose.monitoring.yml up -d

echo.
echo ⏳ Attente du démarrage...
timeout /t 10 /nobreak >nul

echo.
echo ✅ Monitoring démarré !
echo.
echo 📊 Accès aux dashboards :
echo   • Grafana:    http://localhost:3000 (admin/securevault)
echo   • Prometheus: http://localhost:9090
echo   • AlertMgr:   http://localhost:9093
echo.
echo 🔧 Commandes utiles :
echo   • Voir logs:  docker compose -f docker-compose.monitoring.yml logs -f
echo   • Arrêter:    docker compose -f docker-compose.monitoring.yml down
echo.
pause
