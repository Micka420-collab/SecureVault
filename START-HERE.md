# 🚀 SecureVault - Guide de Démarrage Ubuntu

## Démarrage Rapide (3 commandes)

```bash
# 1. Rendre les scripts exécutables
chmod +x start-ubuntu.sh check-and-fix.sh

# 2. Vérifier la configuration
./check-and-fix.sh

# 3. Démarrer SecureVault
./start-ubuntu.sh
```

## Accès après démarrage

- **Interface Web** : http://localhost:8080
- **API Backend** : http://localhost:3001
- **Health Check** : http://localhost:3001/api/health

## Commandes utiles

```bash
# Voir les logs
docker compose logs -f

# Arrêter les services
docker compose down

# Redémarrer
docker compose restart

# Reconstruire complètement
docker compose up --build -d
```

## Corrections apportées

### 1. Schéma Prisma
- Changé de SQLite vers PostgreSQL pour Docker

### 2. Backend Dockerfile
- Ajout de `netcat-openbsd` pour attendre la DB
- Ajout d'un `entrypoint.sh` pour migrations automatiques

### 3. Routes manquantes
- Ajout des routes `/api/search` et `/api/shamir` dans `index.js`

### 4. Dépendances OCR
- Ajout de `tesseract.js`, `pdf-parse`, `sharp`, `multer`

### 5. Configuration sans SSL
- `docker-compose.override.yml` désactive le port 443
- Frontend accessible uniquement en HTTP sur le port 8080

## Dépannage

### Problème : "database connection error"
```bash
# Attendre que PostgreSQL soit prêt
docker compose logs postgres --tail=20
```

### Problème : "port already in use"
```bash
# Trouver et tuer le processus
sudo lsof -i :8080
sudo kill -9 <PID>
```

### Problème : "prisma migrate deploy failed"
```bash
# Reset complet (⚠️ perd les données)
docker compose down -v
docker compose up --build -d
```

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Nginx (80)    │────▶│  Backend (3001) │────▶│  PostgreSQL     │
│   Frontend      │     │  Node.js/Express│     │  (port 5432)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                                               
        ▼                                               
┌─────────────────┐                                     
│  Mail Server    │                                     
│  (ports 25/587) │                                     
└─────────────────┘                                     
```

---
**By Nextendo x Micka Delcato** 🔐
