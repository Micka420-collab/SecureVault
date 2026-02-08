# 📋 Checklist de Déploiement - SecureVault

Liste exhaustive des étapes à suivre pour que tout fonctionne correctement.

---

## ✅ Étape 1 : Base de Données (CRITIQUE)

### 1.1 Migrer le schéma Prisma
```bash
cd backend
npx prisma db push
```

**Vérification** : 
- [ ] La table `audit_logs` est créée
- [ ] La colonne `clientAuthHash` est ajoutée à `users`
- [ ] La colonne `totpVerified` est ajoutée à `sessions`

### 1.2 Vérifier les index
```bash
npx prisma studio
```
Vérifier que les index sont bien créés sur :
- `audit_logs(userId, action, timestamp)`
- `sessions(token, userId)`

---

## ✅ Étape 2 : Variables d'Environnement (CRITIQUE)

### 2.1 Backend (.env)
```bash
cp backend/.env.example backend/.env
```

**Variables OBLIGATOIRES à modifier** :
```env
# Générer avec : openssl rand -base64 32
JWT_SECRET=votre_secret_jwt_32_caracteres_min
SESSION_SECRET=votre_secret_session_32_caracteres_min
REAL_EMAIL_ENCRYPTION_KEY=votre_cle_chiffrement_base64

# Base de données
DB_PASSWORD=mot_de_passe_fort_aleatoire

# Email
MAIL_DOMAIN=votre-domaine.com

# Nouvelle variable CORS
ALLOWED_ORIGINS=https://votre-domaine.com,https://app.votre-domaine.com
```

### 2.2 Frontend (.env)
```bash
cp frontend/.env.example frontend/.env  # si existe
```

```env
VITE_API_URL=https://api.votre-domaine.com
```

### 2.3 Vérification
```bash
node scripts/security-check.js
```
**Doit afficher** : ✅ Tous les checks passés

---

## ✅ Étape 3 : Installation des Dépendances

### 3.1 Backend
```bash
cd backend
npm install

# Vérifier les dépendances de sécurité
npm audit
# Si des vulnérabilités : npm audit fix
```

**Dépendances clés à vérifier** :
- [ ] `argon2` (^0.31.2)
- [ ] `helmet` (^7.1.0)
- [ ] `express-rate-limit` (^7.1.5)
- [ ] `@prisma/client` (^5.7.0)

### 3.2 Frontend
```bash
cd frontend
npm install
```

---

## ✅ Étape 4 : Tests (RECOMMANDÉ)

### 4.1 Tests Backend
```bash
cd backend
npm test
```

**Résultat attendu** :
```
✓ Crypto Security
  ✓ Password Hashing (Argon2id)
  ✓ Encryption (AES-256-GCM)
  ✓ Password Generation
  ✓ Salt Generation
✓ Input Validation
  ✓ UUID Validation
  ✓ Email Validation
```

### 4.2 Tests manuels rapides
- [ ] Créer un compte test
- [ ] Activer la 2FA
- [ ] Créer une entrée dans le vault
- [ ] Verrouiller/Déverrouiller la session
- [ ] Vérifier que les logs d'audit sont créés

---

## ✅ Étape 5 : Build et Assets

### 5.1 Générer le client Prisma
```bash
cd backend
npx prisma generate
```

### 5.2 Build Frontend (pour production)
```bash
cd frontend
npm run build
```

**Vérifier** :
- [ ] Le dossier `frontend/dist` est créé
- [ ] `sw.js` est présent dans `public/`
- [ ] `manifest.json` est présent dans `public/`

### 5.3 Copier les assets statiques
```bash
# Si vous utilisez Nginx
cp -r frontend/dist/* /var/www/securevault/
cp frontend/public/sw.js /var/www/securevault/
cp frontend/public/manifest.json /var/www/securevault/
```

---

## ✅ Étape 6 : Configuration Docker (Si utilisé)

### 6.1 Rebuild des conteneurs
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

### 6.2 Vérifier les logs
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Pas d'erreurs** :
- Pas de "JWT_SECRET not set"
- Pas de "DATABASE_URL invalid"
- Pas d'erreur Prisma

---

## ✅ Étape 7 : Configuration Nginx/SSL (Production)

### 7.1 Configuration Nginx minimale
```nginx
server {
    listen 443 ssl http2;
    server_name votre-domaine.com;

    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Frontend
    location / {
        root /var/www/securevault;
        try_files $uri $uri/ /index.html;
        
        # Headers de sécurité
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    }

    # API Backend
    location /api/ {
        proxy_pass http://localhost:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Limite de taille pour les imports
        client_max_body_size 10M;
    }
}

# Redirection HTTP vers HTTPS
server {
    listen 80;
    server_name votre-domaine.com;
    return 301 https://$server_name$request_uri;
}
```

### 7.2 Vérifier SSL
```bash
curl -I https://votre-domaine.com
# Doit retourner 200 OK avec headers de sécurité
```

---

## ✅ Étape 8 : Vérifications Post-Déploiement

### 8.1 Endpoints critiques à tester
```bash
# Health check
curl https://api.votre-domaine.com/api/health

# Auth - Register
curl -X POST https://api.votre-domaine.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","masterPassword":"test1234567890"}'

# Auth - Login
curl -X POST https://api.votre-domaine.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","masterPassword":"test1234567890"}'
```

### 8.2 Vérifier le fonctionnement des nouvelles features
- [ ] **Audit logs** : Se connecter à Prisma Studio, vérifier que `audit_logs` se remplit
- [ ] **Session warning** : Attendre 13 minutes, vérifier que l'avertissement s'affiche
- [ ] **Rate limiting** : Faire 6 requêtes auth rapides, vérifier le blocage (429)
- [ ] **Offline mode** : Déconnecter le réseau, vérifier l'indicateur offline
- [ ] **Export chiffré** : Tester l'export depuis le frontend

### 8.3 Vérifier les logs d'erreurs
```bash
# Backend
tail -f backend/logs/error.log  # ou docker-compose logs backend

# Chercher ces erreurs (ne doivent PAS apparaître) :
# - "Invalid 2FA secret format"
# - "Account not configured for unlock"
# - "Database connection error"
```

---

## ✅ Étape 9 : Données Existantes (Migration)

### 9.1 Migrer les utilisateurs existants
Les utilisateurs existants n'ont pas de `clientAuthHash`. Ils doivent :
1. Se déconnecter et se reconnecter une fois
2. Le `clientAuthHash` sera généré automatiquement au login

**Alternative (admin)** :
```bash
# Forcer tous les utilisateurs à se reconnecter (invalide toutes les sessions)
cd backend
npx prisma db execute --file="scripts/clear_sessions.sql"
```

### 9.2 Vérifier la cohérence des données
```sql
-- Vérifier les utilisateurs sans clientAuthHash
SELECT id, email FROM users WHERE clientAuthHash IS NULL;
-- Doit retourner 0 ligne après les migrations
```

---

## ✅ Étape 10 : Monitoring et Maintenance

### 10.1 Activer le monitoring des logs d'audit
```bash
# Script simple pour surveiller les activités suspectes
tail -f /var/log/securevault/audit.log | grep "SUSPICIOUS_ACTIVITY\|RATE_LIMIT_HIT"
```

### 10.2 Backup automatique
```bash
# Ajouter au crontab (backup quotidien à 3h du matin)
0 3 * * * cd /path/to/securevault && docker-compose exec -T postgres pg_dump -U vault securevault > /backup/securevault-$(date +\%Y\%m\%d).sql
```

### 10.3 Vérification régulière
```bash
# Une fois par semaine
node scripts/security-check.js
npm audit --prefix backend
```

---

## 🚨 Résolution des Problèmes Courants

### Problème : "Account not configured for unlock"
**Cause** : L'utilisateur n'a pas de `clientAuthHash`
**Solution** : Se déconnecter et se reconnecter

### Problème : "Invalid 2FA secret format"
**Cause** : Anciens secrets TOTP au mauvais format
**Solution** : Désactiver et réactiver la 2FA

### Problème : Rate limiting trop agressif
**Solution** : Modifier dans `backend/src/index.js` :
```javascript
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10, // Augmenter si nécessaire
});
```

### Problème : CORS errors
**Solution** : Vérifier `ALLOWED_ORIGINS` dans le `.env`

---

## 📝 Commandes Résumé (Copier-Coller)

```bash
# 1. Base de données
cd backend && npx prisma db push

# 2. Vérification sécurité
node scripts/security-check.js

# 3. Tests
cd backend && npm test

# 4. Build
cd frontend && npm run build

# 5. Docker (si utilisé)
docker-compose down && docker-compose up -d --build

# 6. Vérification finale
curl https://api.votre-domaine.com/api/health
```

---

## ✨ Vérification Finale

Tout est OK si :
- [ ] `node scripts/security-check.js` passe sans erreur
- [ ] `npm test` passe tous les tests
- [ ] `docker-compose ps` montre tous les services UP
- [ ] L'application web charge correctement
- [ ] Login/Register fonctionnent
- [ ] Les logs d'audit se remplissent
- [ ] Le service worker s'enregistre (voir Console DevTools)

**En cas de problème** : Consulter les logs Docker/backend et vérifier les étapes ci-dessus.
