# 🔒 Plan de Corrections Sécurité - SecureVault

Rapport d'analyse du 2026-02-08 - Corrections des vulnérabilités identifiées

---

## 🚨 Vulnérabilités Critiques

### 1. 🔴 Secrets Faibles en Environnement de Test

**Problème :** Les secrets par défaut dans `.env.example` et les scripts d'installation utilisent des valeurs prévisibles.

**Correction :**

```bash
# ❌ AVANT (dangereux)
JWT_SECRET=CHANGE_ME_your_jwt_secret_key
SESSION_SECRET=CHANGE_ME_your_session_secret_key

# ✅ APRÈS (sécurisé)
# Génération obligatoire de secrets forts
JWT_SECRET=$(openssl rand -base64 32)
SESSION_SECRET=$(openssl rand -base64 32)
```

**Implémentation :**

```javascript
// backend/src/utils/secretGenerator.js
import crypto from 'crypto';

export function generateSecureSecret(length = 64) {
    return crypto.randomBytes(length).toString('hex');
}

export function validateSecret(secret) {
    // Minimum 32 caractères, forte entropie
    if (secret.length < 32) return false;
    
    // Vérifier la complexité
    const hasUpper = /[A-Z]/.test(secret);
    const hasLower = /[a-z]/.test(secret);
    const hasNumbers = /[0-9]/.test(secret);
    const hasSpecial = /[^A-Za-z0-9]/.test(secret);
    
    return hasUpper && hasLower && hasNumbers && hasSpecial;
}
```

---

### 2. 🔴 Utilisation de SQLite en Production

**Problème :** SQLite n'est pas adapté pour la production (concurrence, performances, backups).

**Migration vers PostgreSQL :**

```prisma
// backend/prisma/schema.prisma

datasource db {
  provider = "postgresql"  // ❌ Avant: "sqlite"
  url      = env("DATABASE_URL")
}
```

**Script de migration :**

```bash
#!/bin/bash
# scripts/migrate-to-postgres.sh

echo "🗄️  Migration SQLite → PostgreSQL"

# Backup SQLite
cp backend/prisma/dev.db backend/prisma/dev.db.backup

# Export données SQLite
sqlite3 backend/prisma/dev.db .dump > /tmp/sqlite_dump.sql

# Conversion pour PostgreSQL
sed -i 's/INTEGER PRIMARY KEY AUTOINCREMENT/SERIAL PRIMARY KEY/g' /tmp/sqlite_dump.sql
sed -i 's/BOOLEAN/BOOLEAN/g' /tmp/sqlite_dump.sql

# Import dans PostgreSQL
psql $DATABASE_URL < /tmp/sqlite_dump.sql

echo "✅ Migration terminée"
```

---

## ⚠️ Vulnérabilités Modérées

### 3. 🟡 Protection CSRF Insuffisante

**Implémentation CSRF complète :**

```javascript
// backend/src/middleware/csrf.js
import csrf from 'csurf';
import cookieParser from 'cookie-parser';

const csrfProtection = csrf({
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict'
    }
});

// Route pour obtenir le token CSRF
export function getCsrfToken(req, res) {
    res.json({ csrfToken: req.csrfToken() });
}

// Middleware de protection
export { csrfProtection };
```

```javascript
// frontend/src/utils/csrf.js
let csrfToken = null;

export async function fetchCsrfToken() {
    const response = await fetch('/api/csrf-token', {
        credentials: 'include'
    });
    const data = await response.json();
    csrfToken = data.csrfToken;
    return csrfToken;
}

export function getCsrfToken() {
    return csrfToken;
}

// Intercepteur API
export function addCsrfHeader(options = {}) {
    return {
        ...options,
        headers: {
            ...options.headers,
            'X-CSRF-Token': csrfToken
        }
    };
}
```

---

### 4. 🟡 Headers de Sécurité Incomplets

**Configuration Helmet complète :**

```javascript
// backend/src/index.js
import helmet from 'helmet';

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: {
        policy: "strict-origin-when-cross-origin"
    },
    xContentTypeOptions: true,
    xFrameOptions: 'DENY',
    xXssProtection: true,
    permissionsPolicy: {
        features: {
            geolocation: ["'none'"],
            microphone: ["'none'"],
            camera: ["'none'"],
            payment: ["'none'"]
        }
    }
}));

// Headers personnalisés supplémentaires
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
});
```

---

## 🔧 Vérifications de Sécurité Automatisées

### Script de vérification

```bash
#!/bin/bash
# scripts/security-check.sh

echo "🔒 Vérification de sécurité SecureVault"
echo ""

# 1. Vérifier les secrets
if grep -r "CHANGE_ME\|password123\|secret123" .env* 2>/dev/null; then
    echo "❌ ERREUR: Secrets faibles détectés!"
    exit 1
fi

# 2. Vérifier SQLite en production
if [ "$NODE_ENV" = "production" ] && grep -q "sqlite" backend/prisma/schema.prisma; then
    echo "❌ ERREUR: SQLite détecté en production!"
    exit 1
fi

# 3. Vérifier les dépendances vulnérables
npm audit --audit-level=high

# 4. Vérifier les clés privées exposées
if find . -name "*.pem" -o -name "*.key" | grep -v node_modules | grep -q .; then
    echo "⚠️  ATTENTION: Fichiers clés potentiellement exposés"
fi

echo "✅ Vérifications terminées"
```

---

## 📋 Checklist Pré-Production

- [ ] Secrets générés avec `openssl rand -base64 32`
- [ ] PostgreSQL configuré (pas SQLite)
- [ ] CSRF protection activée
- [ ] Headers de sécurité configurés
- [ ] HTTPS forcé (HSTS)
- [ ] Rate limiting activé
- [ ] Logs d'audit configurés
- [ ] Fail2ban installé
- [ ] Backups automatisés
- [ ] Monitoring actif (Prometheus/Grafana)
- [ ] `npm audit` sans vulnérabilités critiques

---

## 🎯 Score de Sécurité Cible

| Vulnérabilité | Avant | Après Correction |
|---------------|-------|------------------|
| Secrets faibles | 🔴 2/10 | 🟢 9/10 |
| SQLite en prod | 🔴 3/10 | 🟢 9/10 |
| CSRF | 🟡 5/10 | 🟢 8/10 |
| Headers sécurité | 🟡 5/10 | 🟢 9/10 |
| **Score Global** | **6.5/10** | **⚡ 8.8/10** |

---

**SecureVault by Nextendo x Micka Delcato** 🔐
Plan de corrections sécurité - Version 1.0
