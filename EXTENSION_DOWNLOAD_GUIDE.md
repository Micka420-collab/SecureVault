# 📥 Guide de Téléchargement de l'Extension

Ce guide explique comment mettre en place le téléchargement de l'extension navigateur depuis le site web SecureVault.

## 🏗️ Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     Utilisateur                            │
│  Visite /extension → Télécharge le package → Installe      │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│                   Serveur Web (Nginx)                      │
│           Sert le frontend React (buildé)                  │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│                   API Backend (Node.js)                    │
│  GET /api/extension/releases  → Liste les packages         │
│  GET /api/extension/download/:file → Télécharge le fichier │
└──────────────────────────┬─────────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────────┐
│               Volume Docker / Dossier Local                │
│                    /app/extensions/                        │
│  • securevault-extension-v1.0.0-chrome.zip                 │
│  • securevault-extension-v1.0.0-firefox.xpi                │
│  • release-info.json                                       │
└────────────────────────────────────────────────────────────┘
```

## 📦 Construction des Packages

### Prérequis

```bash
cd browser-extension
npm install
```

### Générer les icônes

```bash
npm run build:icons
```

Cela crée les fichiers PNG à partir du SVG source.

### Construire les packages

```bash
npm run build:extension
```

Cela crée :
- `dist/releases/securevault-extension-v1.0.0-chrome.zip` - Pour Chrome/Edge
- `dist/releases/securevault-extension-v1.0.0-firefox.xpi` - Pour Firefox
- `dist/releases/release-info.json` - Métadonnées

## 🚀 Déploiement

### Option 1 : Développement local

```bash
# 1. Construire l'extension
cd browser-extension
npm run build:all

# 2. Copier vers le backend
mkdir -p ../backend/extensions
cp dist/releases/* ../backend/extensions/

# 3. Démarrer le backend
cd ../backend
npm run dev
```

### Option 2 : Docker

```bash
# 1. Construire l'extension
cd browser-extension
npm run build:all

# 2. Copier dans le volume Docker
docker run --rm -v securevault_extensions_data:/data -v $(pwd)/dist/releases:/releases alpine cp -r /releases/* /data/

# 3. Redémarrer le backend
docker-compose restart backend
```

### Option 3 : Pipeline CI/CD

```yaml
# .github/workflows/build-extension.yml
name: Build Extension

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd browser-extension
          npm install
      
      - name: Build icons
        run: |
          cd browser-extension
          npm run build:icons
      
      - name: Build packages
        run: |
          cd browser-extension
          npm run build:extension
      
      - name: Upload to release
        uses: actions/upload-artifact@v3
        with:
          name: extension-packages
          path: browser-extension/dist/releases/
```

## 🔧 Configuration

### Variables d'environnement

```env
# backend/.env

# Chemin vers les extensions (optionnel, défaut: ./extensions)
EXTENSION_DIR=./extensions

# Ou pour un chemin absolu
EXTENSION_DIR=/var/www/securevault/extensions
```

### Nginx (Production)

Si vous voulez servir les extensions directement via Nginx (plus rapide) :

```nginx
location /extensions/ {
    alias /var/www/securevault/extensions/;
    add_header Content-Disposition "attachment";
    
    # CORS headers pour téléchargement cross-origin
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods GET;
}
```

## 📋 API Endpoints

### Liste des releases

```http
GET /api/extension/releases
```

Réponse :
```json
{
  "available": true,
  "version": "1.0.0",
  "date": "2024-01-15T10:30:00Z",
  "packages": [
    {
      "filename": "securevault-extension-v1.0.0-chrome.zip",
      "browser": "chrome",
      "size": 45678,
      "sizeFormatted": "44.6 KB",
      "downloadUrl": "/api/extension/download/securevault-extension-v1.0.0-chrome.zip",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "installInstructions": {
    "chrome": ["..."],
    "firefox": ["..."]
  }
}
```

### Téléchargement

```http
GET /api/extension/download/securevault-extension-v1.0.0-chrome.zip
```

Headers de réponse :
```
Content-Type: application/zip
Content-Disposition: attachment; filename="securevault-extension-v1.0.0-chrome.zip"
```

## 🎨 Interface Utilisateur

### Page principale

La page `/extension` affiche :
1. Détection automatique du navigateur
2. Bouton de téléchargement principal
3. Cartes pour tous les navigateurs supportés
4. Instructions d'installation détaillées
5. Guide de configuration

### Détection navigateur

```javascript
const browser = browserDetection.detect(); // 'chrome' | 'firefox' | 'edge' | 'safari'
const isSupported = browserDetection.isSupported(browser);
```

## 🔒 Sécurité

### Validation des fichiers

- Seuls les fichiers `.zip` et `.xpi` sont acceptés
- Vérification du chemin (pas de traversée de répertoire)
- Headers de sécurité (nosniff)

### Checksums

Les packages incluent des checksums SHA256 dans `release-info.json` :

```json
{
  "packages": [{
    "sha256": "a1b2c3d4e5f6..."
  }]
}
```

## 🐛 Dépannage

### "Extensions not available"

**Cause** : Les fichiers d'extension n'ont pas été copiés dans le dossier.

**Solution** :
```bash
cd browser-extension
npm run build:all
mkdir -p ../backend/extensions
cp dist/releases/* ../backend/extensions/
```

### "File not found"

**Cause** : Le fichier existe mais le chemin est incorrect.

**Solution** : Vérifiez la variable `EXTENSION_DIR`.

### CORS errors

**Cause** : Le frontend ne peut pas accéder à l'API.

**Solution** : Vérifiez `ALLOWED_ORIGINS` dans le backend.

## 📊 Monitoring

### Logs

Les téléchargements sont logués via audit logs :

```
[AUDIT] EXTENSION_DOWNLOADED | User: anonymous | IP: xxx.xxx.xxx.xxx
```

### Métriques

Nombre de téléchargements par navigateur :

```bash
# Analyser les logs
grep "EXTENSION_DOWNLOADED" /var/log/securevault/app.log | \
  jq -s 'group_by(.browser) | map({browser: .[0].browser, count: length})'
```

## 🔄 Mise à jour

Pour publier une nouvelle version :

1. Mettre à jour `version` dans `browser-extension/manifest.json`
2. Reconstruire : `npm run build:extension`
3. Copier les nouveaux fichiers
4. La page `/extension` affichera automatiquement la nouvelle version

---

**Note** : Les extensions restent en mode "développeur" car elles ne sont pas publiées sur les stores officiels (Chrome Web Store, Mozilla Add-ons). C'est une limitation volontaire pour un déploiement auto-hébergé.
