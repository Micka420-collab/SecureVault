# 🏗️ SecureVault - Architecture Complète

## Vue d'ensemble

SecureVault est une application **100% offline** de gestion de mots de passe avec chiffrement de bout en bout.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                         │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   React UI  │  │  Encryption │  │  Service Worker (PWA)   │  │
│  │  (Offline)  │  │  AES-256-GCM│  │                         │  │
│  └──────┬──────┘  └─────────────┘  └─────────────────────────┘  │
│         │                                                        │
│  🔐 La clé maître ne quitte JAMAIS le navigateur                │
└─────────┼────────────────────────────────────────────────────────┘
          │ HTTP (localhost uniquement)
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         SERVEUR (Docker)                         │
│                                                                  │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐   │
│  │    Nginx     │─────▶│    Node.js   │─────▶│  PostgreSQL  │   │
│  │   (Port 80)  │      │  (Port 3001) │      │  (Port 5432) │   │
│  └──────────────┘      └──────┬───────┘      └──────────────┘   │
│                               │                                  │
│  ┌──────────────┐            │          ┌──────────────┐        │
│  │  Mail Server │            │          │    OCR       │        │
│  │  (Postfix)   │            │          │  (Tesseract) │        │
│  └──────────────┘            │          └──────────────┘        │
│                              │                                   │
│  📦 Tout est local, rien ne sort du réseau local               │
└─────────────────────────────────────────────────────────────────┘
```

## Structure des dossiers

```
SecureVault/
│
├── 📁 backend/                    # API Node.js
│   ├── src/
│   │   ├── config/               # Configuration DB
│   │   ├── crypto/               # Chiffrement côté serveur
│   │   ├── middleware/           # Auth, rate limiting, audit
│   │   ├── routes/               # API endpoints
│   │   │   ├── auth.js          # Login/Register/2FA
│   │   │   ├── vault.js         # Gestion mots de passe
│   │   │   ├── alias.js         # Alias email
│   │   │   ├── documents.js     # Upload fichiers chiffrés
│   │   │   ├── search.js        # Recherche OCR
│   │   │   ├── security.js      # Score sécurité, emergency access
│   │   │   ├── shamir.js        # Partage secret
│   │   │   └── extension.js     # API extension navigateur
│   │   ├── services/             # Logique métier
│   │   │   ├── ocrService.js    # OCR 100% offline
│   │   │   ├── shamirService.js # Partage secret
│   │   │   └── emergencyAccess.js
│   │   └── index.js             # Point d'entrée
│   ├── prisma/
│   │   └── schema.prisma        # Modèle PostgreSQL
│   ├── Dockerfile               # Container backend
│   └── entrypoint.sh            # Migrations auto
│
├── 📁 frontend/                   # Application React
│   ├── src/
│   │   ├── components/           # Composants UI
│   │   ├── pages/                # Pages (Login, Vault, etc.)
│   │   ├── hooks/                # Hooks React
│   │   │   └── usePasswordCheck.js  # Vérification offline
│   │   ├── stores/               # State management (Zustand)
│   │   └── services/             # API client
│   ├── public/                   # Assets statiques
│   │   ├── logo-securevault.png
│   │   └── manifest.json
│   ├── Dockerfile               # Container frontend (Nginx)
│   └── nginx.conf               # Config proxy API
│
├── 📁 browser-extension/          # Extension navigateur
│   ├── src/
│   │   ├── background.js        # Service worker
│   │   ├── content.js           # Injection page
│   │   └── autofill.js          # Remplissage auto
│   ├── icons/
│   └── manifest.json
│
├── 📁 mail/                       # Serveur mail (optionnel)
│   ├── Dockerfile
│   └── postfix/                  # Config Postfix
│
├── 📁 scripts/                    # Utilitaires
│   ├── setup-monitoring.sh
│   └── security-check.sh
│
├── 🐳 docker-compose.yml          # Orchestration principale
├── 🐳 docker-compose.override.yml # Override local (no SSL)
├── 🚀 start-ubuntu.sh            # Script démarrage
├── 🔍 check-and-fix.sh           # Vérification
└── 📄 README.md
```

## Flux de données

### 1. Création d'un mot de passe (Chiffrement E2E)

```
┌──────────────┐
│   User       │
│   Password   │
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────┐
│  1. Génération clé depuis Master Key  │
│     (PBKDF2 + Salt)                    │
│                                        │
│  2. Chiffrement AES-256-GCM            │
│     password → encryptedData + IV     │
└──────┬─────────────────────────────────┘
       │ HTTPS (données déjà chiffrées!)
       ▼
┌────────────────────────────────────────┐
│  3. Stockage PostgreSQL               │
│     Table: vault_entries              │
│     - encryptedData (TEXT)            │
│     - iv (STRING)                     │
│     - userId (UUID)                   │
└────────────────────────────────────────┘

🔐 Le serveur ne voit JAMAIS le mot de passe en clair
```

### 2. Authentification (Zero-Knowledge)

```
┌──────────────┐
│ Login        │
│ email + pwd  │
└──────┬───────┘
       │
       ▼
┌────────────────────────────────────────┐
│  1. Client génère clientAuthHash      │
│     SHA256(email + masterKey)         │
└──────┬─────────────────────────────────┘
       │ POST /api/auth/login
       ▼
┌────────────────────────────────────────┐
│  2. Backend vérifie avec Argon2       │
│     (hash stocké = clientAuthHash)    │
│                                        │
│  3. Si OK → JWT Token généré          │
└──────┬─────────────────────────────────┘
       │ JWT Token
       ▼
┌────────────────────────────────────────┐
│  4. Client déchiffre ses données      │
│     avec sa clé maître (locale)       │
└────────────────────────────────────────┘

🔐 Le mot de passe ne quitte jamais le navigateur
🔐 La clé de déchiffrement reste en mémoire client
```

### 3. Partage d'urgence (Emergency Access)

```
Alice veut donner accès à Bob en cas d'urgence

┌──────────┐                    ┌──────────┐
│  Alice   │ ──Setup──────────▶ │ Serveur  │
│          │  grantee: Bob      │          │
└──────────┘  waitTime: 24h     └──────────┘
                                      │
┌──────────┐                         │
│   Bob    │ ──Request───────────────┤
│          │                         │
└──────────┘                         ▼
                              ┌──────────────┐
                              │ Timer 24h    │
                              │ Notification │
                              └──────────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │ Alice refuse?│──NON──▶ Annulé
                              └──────────────┘
                                      │
                                     OUI
                                      │
                                      ▼
                              ┌──────────────┐
                              │ Auto-approve │
                              │ après 24h    │
                              └──────┬───────┘
                                     │
                                     ▼
┌──────────┐               ┌───────────────────┐
│   Bob    │ ◀──Clé─────── │ encryptedKey      │
│          │   chiffrée    │ (pour Bob seul)   │
└──────────┘               └───────────────────┘

🔐 Alice peut refuser pendant 24h
🔐 Bob reçoit la clé chiffrée pour lui uniquement
```

## Sécurité par couche

### Couche 1: Transport
- HTTPS/TLS entre client et serveur
- CORS strict (localhost uniquement)
- Rate limiting par IP et par utilisateur

### Couche 2: Authentification
- Argon2id pour les hashes (résistant GPU/ASIC)
- JWT avec expiration courte (15min)
- Refresh tokens rotatifs
- 2FA TOTP supporté

### Couche 3: Chiffrement
- **AES-256-GCM** pour les données
- **PBKDF2** pour la dérivation de clé (100k iterations)
- IV unique par entrée
- Clé dérivée du mot de passe maître (jamais stockée)

### Couche 4: Stockage
- PostgreSQL avec chiffrement au repos
- Données déjà chiffrées côté client
- Pas de clés en clair dans la DB

## Services et ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend (Nginx) | 80 | Interface utilisateur |
| Backend (Node) | 3001 | API REST |
| PostgreSQL | 5432 | Base de données |
| Mail (Postfix) | 25, 587 | Serveur mail (opt.) |

## Dépendances externes (AVANT / APRÈS)

| Service | AVANT | APRÈS (ce repo) |
|---------|-------|-----------------|
| Vérification breach | Have I Been Pwned API | ✅ Liste locale |
| Favicons | Google API | ✅ Initiales locales |
| OCR | Tesseract Cloud | ✅ Tesseract local |
| Analytics | Google Analytics | ❌ Supprimé |
| Fonts | Google Fonts | ✅ Polices système |
| Icons | FontAwesome CDN | ✅ Lucide React (bundle) |

## Configuration requise

### Minimum
- Ubuntu 20.04+
- 2GB RAM
- 10GB disque
- Docker & Docker Compose

### Recommandé
- 4GB RAM
- SSD
- Docker 24.0+

## Démarrage rapide

```bash
# 1. Cloner
# (déjà fait)

# 2. Démarrer
./start-ubuntu.sh

# 3. Accéder
http://localhost:8080
```

## Monitoring

```bash
# Logs en temps réel
docker compose logs -f

# Stats containers
docker stats

# Health check
curl http://localhost:3001/api/health
```

---

*Architecture sécurisée, vérifiée et 100% offline.*
