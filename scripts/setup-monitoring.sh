#!/bin/bash

# Setup Monitoring - SecureVault by Nextendo x Micka Delcato

echo ""
echo -e "\033[36m╔═══════════════════════════════════════════════════════════════════════════╗\033[0m"
echo -e "\033[36m║         📊 SecureVault Monitoring Setup - by Nextendo x Micka Delcato                     ║\033[0m"
echo -e "\033[36m╚═══════════════════════════════════════════════════════════════════════════╝\033[0m"
echo ""

cd "$(dirname "$0")/.."

echo "🔧 Configuration du monitoring Prometheus + Grafana..."
echo ""

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé !"
    exit 1
fi

# Créer les dossiers
echo "📁 Création de la structure..."
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources

# Démarrer les services
echo ""
echo "🐳 Démarrage des services de monitoring..."
docker compose -f docker-compose.monitoring.yml up -d

echo ""
echo "⏳ Attente du démarrage..."
sleep 10

echo ""
echo -e "\033[32m✅ Monitoring démarré !\033[0m"
echo ""
echo "📊 Accès aux dashboards :"
echo "  • Grafana:    http://localhost:3000 (admin/securevault)"
echo "  • Prometheus: http://localhost:9090"
echo "  • AlertMgr:   http://localhost:9093"
echo ""
echo "🔧 Commandes utiles :"
echo "  • Voir logs:  docker compose -f docker-compose.monitoring.yml logs -f"
echo "  • Arrêter:    docker compose -f docker-compose.monitoring.yml down"
echo ""
