# SecureVault Browser Extension

Extension navigateur pour SecureVault - Auto-fill sécurisé pour votre gestionnaire de mots de passe auto-hébergé.

## 🚀 Fonctionnalités

- **Auto-fill intelligent** : Détection automatique des formulaires de connexion
- **Chiffrement de bout en bout** : Vos mots de passe ne sont jamais exposés en clair
- **Intégration Tailscale** : Fonctionne parfaitement sur votre réseau privé Tailscale
- **Zero-knowledge** : Le serveur ne voit jamais vos mots de passe déchiffrés
- **Popup de sélection** : Choisissez quels identifiants remplir
- **Raccourcis clavier** : Ctrl+Shift+L pour remplir rapidement

## 📦 Installation

### Chrome / Edge

1. Ouvrez `chrome://extensions/`
2. Activez le "Mode développeur"
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `browser-extension`

### Firefox

1. Ouvrez `about:debugging`
2. Cliquez sur "Ce Firefox"
3. Cliquez sur "Charger un module complémentaire temporaire"
4. Sélectionnez `manifest.json`

## ⚙️ Configuration

### 1. Configurer le serveur

Cliquez sur l'icône de l'extension → ⚙️ Settings

Entrez l'URL de votre serveur SecureVault :
- **Avec Tailscale** : `https://monvault.mon-tailnet.ts.net`
- **Avec IP Tailscale** : `http://100.64.x.x:3001`
- **Local** : `http://localhost:3001` (développement uniquement)

### 2. Authentification

Cliquez sur l'extension et entrez vos identifiants SecureVault :
- Email
- Master Password

L'extension génère automatiquement un token unique lié à votre compte.

### 3. Utilisation

Visitez un site web pour lequel vous avez des identifiants :
- L'extension détecte automatiquement les formulaires de connexion
- Cliquez sur l'icône SecureVault dans le champ
- Ou utilisez le raccourci `Ctrl+Shift+L`

## 🔒 Sécurité

### Architecture Zero-Knowledge

```
[Extension] ←→ [Chiffré] ←→ [Serveur SecureVault]
     ↓
[Déchiffrement avec Master Password]
     ↓
[Formulaire web]
```

- Les données sont chiffrées sur le client avec AES-256-GCM
- La clé est dérivée de votre master password (PBKDF2)
- Le serveur stocke uniquement des données chiffrées
- Le token d'extension est unique et révocable

### Vérification de domaine

L'extension vérifie strictement la correspondance du domaine pour prévenir le phishing :
- Exact match : `example.com` = `example.com` ✅
- Subdomain match : `login.example.com` = `example.com` ✅ (configurable)
- Mismatch : `evil-example.com` ≠ `example.com` ❌

## 🛠️ Développement

### Structure

```
browser-extension/
├── manifest.json          # Configuration Manifest V3
├── popup.html            # Interface popup
├── options.html          # Page de paramètres
├── icons/                # Icônes
└── src/
    ├── content.js        # Script de contenu (détection formulaires)
    ├── background.js     # Service Worker (communication API)
    ├── popup.js          # Logique popup
    └── options.js        # Logique options
```

### Build

Pour générer les icônes PNG à partir du SVG :

```bash
# Nécessite ImageMagick
convert -background none icons/icon.svg -resize 16x16 icons/icon16.png
convert -background none icons/icon.svg -resize 32x32 icons/icon32.png
convert -background none icons/icon.svg -resize 48x48 icons/icon48.png
convert -background none icons/icon.svg -resize 128x128 icons/icon128.png
```

### Debugging

1. Ouvrez la popup de l'extension
2. Clic droit → "Inspecter"
3. Onglet "Console" pour voir les logs

Pour le service worker :
1. `chrome://extensions/`
2. Cliquez sur "Service Worker" sous l'extension

## 📝 Permissions

- `activeTab` : Accès à l'onglet actif pour remplir les formulaires
- `storage` : Stockage local des paramètres et tokens
- `scripting` : Injection du script de contenu
- `notifications` : Notifications de confirmation

## 🐛 Dépannage

### "Not connected"
- Vérifiez que le serveur SecureVault est en ligne
- Vérifiez l'URL dans les paramètres
- Testez la connexion via Tailscale

### "Session expired"
- Le token a expiré ou été révoqué
- Reconnectez-vous depuis la popup

### Auto-fill ne fonctionne pas
- Vérifiez que vous avez des identifiants pour ce site dans SecureVault
- Certains sites utilisent des formulaires non standards
- Essayez de cliquer manuellement sur l'icône SecureVault

## 📄 Licence

MIT - Voir LICENSE pour plus de détails.
