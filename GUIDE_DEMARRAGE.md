# 🚀 Guide de Démarrage - SecureVault

> **SecureVault by Nextendo X Micka Delcato** - Votre coffre-fort numérique sécurisé

Ce guide explique comment démarrer SecureVault pour la première fois.

## 📋 Prérequis

- **Node.js** 18+ et npm
- **Docker** et Docker Compose (optionnel mais recommandé)
- Un navigateur moderne (Chrome, Firefox, Edge)

---

## 🔧 Installation Manuelle (Développement)

### 1. Configuration environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer .env avec vos paramètres
nano .env
```

**Variables obligatoires :**
```env
JWT_SECRET=votre_jwt_secret_32_caracteres_min
SESSION_SECRET=votre_session_secret_32_caracteres_min
DB_PASSWORD=mot_de_passe_db_secure
```

Générez des secrets forts :
```bash
openssl rand -base64 32
```

---

### 2. Backend

```bash
cd backend

# Installer les dépendances
npm install

# Générer le client Prisma
npm run db:generate

# Créer la base de données (SQLite)
npm run db:push

# Démarrer en mode développement
npm run dev
```

Le backend démarre sur `http://localhost:3001`

---

### 3. Frontend

```bash
cd frontend

# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

Le frontend démarre sur `http://localhost:5173`

---

### 4. Extension Navigateur (Optionnel)

```bash
cd browser-extension

# Installer les dépendances
npm install

# Générer les icônes
npm run build:icons

# Charger l'extension dans Chrome :
# 1. Ouvrir chrome://extensions/
# 2. Activer "Mode développeur"
# 3. Cliquer "Charger l'extension non empaquetée"
# 4. Sélectionner le dossier browser-extension/
```

---

## 🐳 Installation avec Docker (Recommandé pour Production)

### Installation Automatique (Recommandé)

```bash
# Windows
.\scripts\install.bat

# Linux/Mac
chmod +x scripts/install.sh
./scripts/install.sh
```

Le script vous demandera quel **port** utiliser :
- **8080** (recommandé) : Pas besoin de root, sécurité maximale
- **3000** : Alternative courante
- **80** : Port standard (nécessite root sur Linux/Mac)

### Installation Manuelle

```bash
# Copier et configurer l'environnement
cp .env.example .env
nano .env  # Configurer vos variables

# Changer le port (optionnel, défaut: 80)
# FRONTEND_PORT=8080

# Construire et démarrer
docker-compose up -d --build

# Vérifier le statut
docker-compose ps

# Voir les logs
docker-compose logs -f backend
```

Services démarrés :
- **Frontend** : http://localhost (ou http://localhost:PORT)
- **Backend API** : http://localhost:3001
- **Base de données** : PostgreSQL (interne)

### Changer le port après installation

```bash
# Windows
.\scripts\change-port.bat

# Linux/Mac
./scripts/change-port.sh
```

---

## ✅ Vérification de l'Installation

### Test 1 - Health Check
```bash
curl http://localhost:3001/api/health
```

Réponse attendue :
```json
{
  "status": "ok",
  "version": "2.0.0",
  "features": ["audit-log", "versioning", "secure-share", "emergency-access", "diceware", "secure-documents"]
}
```

### Test 2 - Créer un compte
1. Ouvrir http://localhost:5173 (ou http://localhost avec Docker)
2. Cliquer sur "Créer un compte"
3. Remplir email + mot de passe maître (12 caractères min)
4. Valider

### Test 3 - Ajouter un mot de passe
1. Aller dans "Coffre-fort"
2. Cliquer "Ajouter"
3. Remplir les champs
4. Sauvegarder

### Test 4 - Upload un document (Optionnel)
1. Aller dans "Documents"
2. Glisser-déposer un fichier
3. Vérifier le chiffrement et l'upload

---

## 📁 Structure des données

### Sans Docker
```
backend/
├── prisma/
│   └── dev.db           # Base SQLite
└── uploads/             # Fichiers uploadés (chiffrés)
```

### Avec Docker
```
Volumes Docker :
├── postgres_data        # Données PostgreSQL
├── uploads_data         # Fichiers uploadés
├── mail_data            # Emails reçus
└── mail_config          # Configuration Postfix
```

---

## 🔐 Configuration Tailscale (Optionnel)

Pour un accès sécurisé depuis n'importe où :

```bash
# Sur le serveur
sudo tailscale up

# Exposer SecureVault
tailscale serve --https=443 --set-path=/ http://localhost:3001

# Votre vault est accessible via :
# https://votre-machine.votre-tailnet.ts.net
```

Configurez l'extension navigateur avec cette URL.

---

## 🛠️ Résolution de problèmes

### Problème : "Cannot find module 'express-validator'"
```bash
cd backend
npm install
```

### Problème : "Cannot find module 'date-fns'"
```bash
cd frontend
npm install
```

### Problème : "Database does not exist"
```bash
cd backend
npm run db:push
```

### Problème : "Port 3001 already in use"
```bash
# Trouver le processus
lsof -i :3001

# Ou changer le port dans .env
PORT=3002
```

### Problème : CORS errors
Vérifiez que `ALLOWED_ORIGINS` dans `.env` contient votre URL frontend :
```env
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 📊 Commandes utiles

### Backend
```bash
npm run dev          # Développement avec hot-reload
npm start            # Production
npm run db:studio    # Interface Prisma (gestion DB)
```

### Frontend
```bash
npm run dev          # Développement
npm run build        # Build production
npm run preview      # Prévisualiser le build
```

### Docker
```bash
docker-compose up -d              # Démarrer
docker-compose down               # Arrêter
docker-compose logs -f [service]  # Logs
docker-compose restart            # Redémarrer
```

---

## 🔄 Mise à jour

```bash
# Récupérer les dernières modifications
git pull

# Mettre à jour le schéma Prisma (si changé)
cd backend
npm run db:push

# Reconstruire les conteneurs (si Docker)
docker-compose up -d --build
```

---

## 🆘 Besoin d'aide ?

- 📖 Documentation API : http://localhost:3001/api/health
- 🐛 Issues : [GitHub Issues](https://github.com/yourusername/securevault/issues)
- 💬 Discussions : [GitHub Discussions](https://github.com/yourusername/securevault/discussions)

---

## ⚠️ Important - Sauvegarde

**Sans votre mot de passe maître, vos données sont irrécupérables !**

- Le mot de passe maître n'est JAMAIS stocké sur le serveur
- Les fichiers sont chiffrés avec AES-256-GCM
- La clé est dérivée de votre mot de passe (PBKDF2)

**Conseil** : Gardez une copie de secours de votre mot de passe maître dans un endroit sécurisé (coffre-fort physique, gestionnaire de mots de passe tiers, etc.)

---

**SecureVault est maintenant prêt à l'emploi !** 🔐
