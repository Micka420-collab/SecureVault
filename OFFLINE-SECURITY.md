# 🔒 SecureVault - Mode 100% Offline

Ce document confirme que SecureVault fonctionne entièrement en local sans aucune connexion Internet requise.

## ✅ Vérification des fuites potentielles

### 1. API Externes supprimées/remplacées

| Service | Avant | Après | Statut |
|---------|-------|-------|--------|
| Have I Been Pwned | `https://api.pwnedpasswords.com` | Vérification locale avec liste de mots communs | ✅ Corrigé |
| Google Favicons | `https://www.google.com/s2/favicons` | Génération locale (initiales) | ✅ Corrigé |
| CDNs | FontAwesome, Google Fonts, etc. | Aucun - tout est local | ✅ Vérifié |

### 2. Fichiers modifiés pour l'offline

```
frontend/src/hooks/usePasswordCheck.js    → Vérification 100% offline
frontend/src/pages/Vault.jsx              → Favicons locales
frontend/index.html                       → CSP restrictif (localhost uniquement)
backend/src/services/ocrService.js        → OCR avec modèles locaux
```

### 3. Content Security Policy (CSP)

```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  connect-src 'self' http://localhost:3001 http://127.0.0.1:3001;
  font-src 'self';
```

**Aucune connexion externe autorisée!**

## 🏗️ Architecture 100% Local

```
┌─────────────────────────────────────────────────────────────┐
│                        VOTRE MACHINE                         │
│                         (Ubuntu)                             │
│                                                              │
│  ┌──────────────┐      ┌──────────────┐      ┌───────────┐  │
│  │   Nginx      │─────▶│   Backend    │─────▶│PostgreSQL │  │
│  │   (Port 80)  │      │  (Port 3001) │      │ (Port 5432)│  │
│  └──────────────┘      └──────────────┘      └───────────┘  │
│         │                                                    │
│         │  Tout en local!                                    │
│         ▼                                                    │
│  ┌──────────────┐                                           │
│  │   Frontend   │                                           │
│  │   (React)    │                                           │
│  └──────────────┘                                           │
│                                                              │
│  🔐 Aucune donnée ne quitte votre machine                    │
└─────────────────────────────────────────────────────────────┘
```

## 🔍 Comment vérifier qu'il n'y a pas de fuites

### 1. Surveiller le trafic réseau

```bash
# Surveiller toutes les connexions sortantes
tcpdump -i any -n | grep -v "127.0.0.1\|localhost\|192.168\|10."

# Ou utiliser netstat
watch -n 1 'netstat -tunap | grep ESTABLISHED'
```

### 2. Vérifier les requêtes dans le navigateur

```javascript
// Dans la console du navigateur (F12)
// Vérifier qu'il n'y a pas d'erreurs réseau vers l'extérieur

// Surveiller toutes les requêtes fetch
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('Fetch:', args[0]);
  return originalFetch.apply(this, args);
};
```

### 3. Vérifier les connexions du backend

```bash
# Sur le serveur Ubuntu
sudo netstat -tunap | grep node | grep -v 127.0.0.1 | grep -v 192.168

# Ne doit rien afficher (sauf connexions locales)
```

## 🛡️ Points de sécurité clés

### 1. Chiffrement
- ✅ Tous les mots de passe chiffrés avec AES-256-GCM **côté client**
- ✅ La clé de chiffrement ne quitte jamais le navigateur
- ✅ Le serveur ne voit jamais les mots de passe en clair

### 2. Base de données
- ✅ PostgreSQL en local uniquement (pas d'accès externe)
- ✅ Les données sont chiffrées avant stockage
- ✅ Pas de réplication cloud

### 3. Fichiers uploadés
- ✅ Stockés localement dans `./uploads`
- ✅ Chiffrés avec les clés de l'utilisateur
- ✅ Pas de cloud storage

### 4. Authentification
- ✅ JWT tokens stockés localement
- ✅ Sessions en mémoire locale
- ✅ Pas de service d'authentification externe

## ⚠️ Limitations du mode offline

| Fonctionnalité | Mode Online | Mode Offline (ce repo) |
|----------------|-------------|------------------------|
| Vérification breach | API Have I Been Pwned | Liste locale (100 mots communs) |
| Favicons sites | Google API | Initiales locales |
| OCR documents | Tesseract online | Modèles locaux requis |
| Updates | Téléchargement auto | Manuel uniquement |

## 🚀 Démarrage en mode offline

```bash
# 1. Assurez-vous d'être offline (déconnectez le câble/WiFi)
ping google.com  # Doit échouer

# 2. Démarrez SecureVault
./start-ubuntu.sh

# 3. Vérifiez que tout fonctionne
# Accédez à http://localhost:8080

# 4. Vérifiez qu'aucune connexion externe n'est établie
sudo netstat -tunap | grep ESTABLISHED | grep -v 127.0.0.1
```

## 🧪 Tests de vérification

### Test 1: Vérification password offline
1. Créez un compte
2. Essayez un mot de passe faible (ex: "password123")
3. Vérifiez qu'il est détecté comme compromis **sans** connexion internet

### Test 2: Favicons locales
1. Ajoutez une entrée avec URL (ex: https://exemple.com)
2. Vérifiez qu'une icône avec la lettre "E" apparaît
3. Aucune requête vers Google ne doit être faite

### Test 3: Pas de fuites DNS
```bash
# Surveillez les requêtes DNS
tcpdump -i any port 53

# Naviguez dans l'application
# Aucune requête DNS ne doit apparaître (sauf localhost)
```

## 📋 Checklist de sécurité

- [ ] Déconnecter le câble Ethernet
- [ ] Désactiver le WiFi
- [ ] Démarrer SecureVault
- [ ] Créer un compte
- [ ] Ajouter des mots de passe
- [ ] Vérifier qu'aucune erreur réseau n'apparaît dans la console (F12)
- [ ] Vérifier avec `netstat` qu'aucune connexion externe n'est établie
- [ ] Tester la vérification de mot de passe faible
- [ ] Tester l'ajout d'URL (favicons locales)

## 🔐 Certification Offline

Ce projet est conçu pour fonctionner **entièrement sans Internet**.

```
┌─────────────────────────────────────────────────┐
│  ✅ ZERO connexion externe requise              │
│  ✅ ZERO donnée envoyée sur Internet            │
│  ✅ ZERO dépendance à des services cloud        │
│  ✅ 100% des calculs de chiffrement côté client │
└─────────────────────────────────────────────────┘
```

**Vos mots de passe restent sur VOTRE machine, comme il se doit.**

---

*SecureVault by Nextendo x Micka Delcato - La sécurité commence par le contrôle de vos données.*
