# 🔐 SecureVault Browser Extension Guide

Guide complet pour l'installation et l'utilisation de l'extension navigateur SecureVault.

## 📋 Table des matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Dépannage](#dépannage)
- [Sécurité](#sécurité)

## Vue d'ensemble

L'extension SecureVault permet de :
- **Auto-fill** : Remplir automatiquement les formulaires de connexion
- **Génération de mots de passe** : Créer des mots de passe forts
- **Sauvegarde rapide** : Enregistrer de nouveaux identifiants
- **Accès rapide** : Interface popup pour accéder à vos credentials

### Compatibilité

- ✅ Chrome 88+ (Manifest V3)
- ✅ Edge 88+ (Manifest V3)
- ✅ Firefox 109+ (Manifest V3)
- ⚠️ Safari (nécessite des adaptations)

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Extension     │     │   SecureVault    │     │   Tailscale     │
│   (Client)      │◄────┤   Server         │◄────┤   Network       │
│                 │     │   (100.64.x.x)   │     │   (optional)    │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │
        ▼
┌─────────────────┐
│   WebCrypto     │
│   (AES-256-GCM) │
└─────────────────┘
```

### Flux de données

1. **Détection** : Le content script détecte les formulaires de connexion
2. **Récupération** : Les credentials chiffrés sont récupérés depuis le serveur
3. **Déchiffrement** : L'extension déchiffre localement avec votre clé
4. **Remplissage** : Les champs sont remplis automatiquement

## Installation

### Prérequis

- SecureVault server installé et accessible
- (Optionnel) Tailscale configuré pour l'accès réseau

### Étape 1 : Générer les icônes

```bash
cd browser-extension

# Avec ImageMagick
convert -background none icons/icon.svg -resize 16x16 icons/icon16.png
convert -background none icons/icon.svg -resize 32x32 icons/icon32.png
convert -background none icons/icon.svg -resize 48x48 icons/icon48.png
convert -background none icons/icon.svg -resize 128x128 icons/icon128.png

# Ou avec Node.js et sharp (npm install sharp)
node -e "
const sharp = require('sharp');
const fs = require('fs');
const svg = fs.readFileSync('icons/icon.svg');
[16, 32, 48, 128].forEach(size => {
    sharp(svg).resize(size, size).png().toFile(\`icons/icon\${size}.png\`);
});
"
```

### Étape 2 : Installation dans Chrome/Edge

1. Ouvrez `chrome://extensions/` (ou `edge://extensions/`)
2. Activez le **Mode développeur** (toggle en haut à droite)
3. Cliquez sur **"Charger l'extension non empaquetée"**
4. Sélectionnez le dossier `browser-extension/`
5. L'extension apparaît dans votre barre d'outils

### Étape 3 : Installation dans Firefox

1. Ouvrez `about:debugging`
2. Cliquez sur **"Ce Firefox"**
3. Cliquez sur **"Charger un module complémentaire temporaire"**
4. Sélectionnez `browser-extension/manifest.json`

> **Note** : Pour une installation permanente dans Firefox, vous devez signer l'extension via addons.mozilla.org ou utiliser Firefox Developer Edition.

## Configuration

### 1. Configurer l'URL du serveur

Cliquez sur l'icône SecureVault → **⚙️ Settings**

| Environnement | URL exemple |
|--------------|-------------|
| Local (dev) | `http://localhost:3001` |
| Tailscale IP | `http://100.64.1.10:3001` |
| Tailscale Funnel | `https://monvault.mon-tailnet.ts.net` |
| Domaine perso | `https://vault.mondomaine.com` |

> 💡 **Conseil** : Utilisez Tailscale pour un accès sécurisé depuis n'importe où sans exposer votre serveur sur Internet.

### 2. Authentification

1. Cliquez sur l'icône SecureVault dans la barre d'outils
2. Entrez votre email SecureVault
3. Entrez votre Master Password
4. Cliquez sur **"Connect"**

L'extension génère automatiquement un token unique stocké localement.

### 3. Préférences (optionnel)

Dans les Settings :

- **Auto-fill on page load** : Remplissage automatique
- **Show save prompt** : Proposer de sauvegarder les nouveaux mots de passe
- **Show in context menu** : Options dans le clic droit
- **Show fill notifications** : Notifications de confirmation

## Utilisation

### Auto-fill automatique

Quand vous visitez un site avec des identifiants enregistrés :

1. Une icône 🔐 apparaît dans les champs de formulaire
2. Cliquez sur l'icône
3. Sélectionnez le credential à utiliser
4. Les champs se remplissent automatiquement

### Raccourcis clavier

| Raccourci | Action |
|-----------|--------|
| `Ctrl+Shift+L` | Ouvrir la popup SecureVault |
| `Ctrl+Shift+F` | Remplir le formulaire courant |

### Génération de mot de passe

1. Focus sur un champ password
2. Clic droit → **"Generate Password"**
3. Le mot de passe est généré et copié

### Sauvegarder un nouveau mot de passe

Quand vous soumettez un formulaire de connexion :
1. Une notification apparaît
2. Cliquez sur **"Save to SecureVault"**
3. Le credential est chiffré et sauvegardé

## Dépannage

### "Not connected"

**Problème** : L'extension ne peut pas joindre le serveur

**Solutions** :
1. Vérifiez que SecureVault server est en ligne
2. Vérifiez l'URL dans les paramètres
3. Testez avec curl :
   ```bash
   curl http://VOTRE_URL/api/health
   ```

### "Session expired"

**Problème** : Le token d'extension a expiré

**Solution** : Reconnectez-vous depuis la popup de l'extension

### L'icône n'apparaît pas

**Problème** : Le formulaire n'est pas détecté

**Solutions** :
1. Rechargez la page (F5)
2. Certains sites utilisent des formulaires non standard
3. Essayez le raccourci `Ctrl+Shift+F`

### CORS errors

**Problème** : Erreurs de cross-origin dans la console

**Solutions** :
1. Vérifiez que le serveur autorise les requêtes depuis `chrome-extension://`
2. Pour le développement, vous pouvez utiliser l'extension "Allow CORS"
3. En production, utilisez Tailscale (même réseau = pas de CORS)

### Auto-fill ne fonctionne pas

**Vérifications** :
1. Avez-vous des credentials pour ce domaine dans SecureVault ?
2. Le domaine correspond-il exactement ? (`www.example.com` ≠ `example.com`)
3. Essayez de cliquer manuellement sur l'icône 🔐

## Sécurité

### Chiffrement

- **Algorithme** : AES-256-GCM
- **Dérivation de clé** : PBKDF2 (600k itérations)
- **IV** : 96 bits aléatoire par entrée

### Zero-Knowledge

```
Master Password ──┬──► Clé de chiffrement ──► Chiffrement local
                  │                              │
                  └──────────────────────────────┘
                                │
                                ▼
                    Données chiffrées envoyées au serveur
```

Le serveur ne voit **JAMAIS** :
- Votre Master Password
- Vos mots de passe déchiffrés
- Vos clés de chiffrement

### Tokens d'extension

- Durée de vie : 30 jours
- Stockage : Chrome Storage API (chiffré par le navigateur)
- Révocation : Possible depuis les paramètres SecureVault
- Unicité : Un token par extension/installation

### Protection anti-phishing

L'extension vérifie strictement les domaines :

```javascript
// Domaines considérés comme identiques
example.com         = example.com        ✅
login.example.com   = example.com        ✅ (optionnel)
www.example.com     = example.com        ✅ (optionnel)

// Domaines considérés comme différents
evil-example.com    ≠ example.com        ❌
example.co          ≠ example.com        ❌
example.com.phish   ≠ example.com        ❌
```

### Audit et logs

Chaque action de l'extension est loguée :
- EXTENSION_REGISTERED
- EXTENSION_REVOKED
- EXTENSION_FILL
- EXTENSION_COPY_PASSWORD
- EXTENSION_COPY_USERNAME

## Développement

### Structure du code

```
browser-extension/
├── manifest.json          # Configuration Manifest V3
├── popup.html            # Interface popup principale
├── options.html          # Page de paramètres
├── src/
│   ├── content.js        # Script injecté dans les pages
│   ├── content.css       # Styles pour l'injection
│   ├── background.js     # Service Worker (API calls)
│   ├── popup.js          # Logique de la popup
│   └── options.js        # Logique des paramètres
├── icons/                # Icônes SVG/PNG
└── README.md             # Documentation
```

### Debug

Chrome DevTools :
1. Ouvrez la popup
2. Clic droit → "Inspecter"
3. Console pour voir les logs

Background script :
1. `chrome://extensions/`
2. Trouvez SecureVault
3. Cliquez sur "Service Worker"

### Tests

```bash
# Charger en mode développement
npm run build:dev

# Tests unitaires
npm test

# Linting
npm run lint
```

## Support

- 📖 Documentation : [README.md](./README.md)
- 🐛 Issues : [GitHub Issues](https://github.com/yourusername/securevault/issues)
- 💬 Discussions : [GitHub Discussions](https://github.com/yourusername/securevault/discussions)

---

**Sécurité d'abord. Confidentialité toujours.** 🔐
