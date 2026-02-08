# 📁 Guide des Documents Sécurisés

Ce guide explique comment utiliser la fonctionnalité de stockage de documents sensibles chiffrés dans SecureVault.

## 🎯 Vue d'ensemble

Le système de documents sécurisés permet de stocker des fichiers sensibles (vidéos, documents, images) avec un chiffrement de bout en bout (AES-256-GCM). Les fichiers sont chiffrés dans le navigateur avant d'être envoyés au serveur.

### Caractéristiques

- **Chiffrement client-side** - AES-256-GCM avec PBKDF2
- **Support des gros fichiers** - Jusqu'à 500MB par fichier (configurable)
- **Streaming vidéo** - Lecture de vidéos chiffrées sans téléchargement complet
- **Vignettes** - Prévisualisation pour images et vidéos
- **Organisation** - Par catégories (vidéo, image, audio, document, autre)
- **Favoris** - Marquez vos documents importants

## 🔐 Architecture de sécurité

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  1. Sélection du fichier                        │   │
│  │  2. Chiffrement AES-256-GCM avec clé utilisateur│   │
│  │  3. Envoi des données chiffrées au serveur      │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS (données chiffrées)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Serveur                             │
│  • Stockage des données chiffrées uniquement            │
│  • Pas d'accès à la clé de déchiffrement                │
│  • Fichiers identifiés par UUID (pas de noms réels)     │
└─────────────────────────────────────────────────────────┘
```

## 📤 Upload de fichiers

### Méthodes d'upload

1. **Bouton "Ajouter"** - Sélection classique via explorateur de fichiers
2. **Glisser-déposer** - Déposez directement sur la zone de documents
3. **Extension navigateur** - (à venir) Sauvegarde depuis le web

### Types de fichiers supportés

| Catégorie | Types MIME |
|-----------|------------|
| Vidéo | MP4, WebM, OGG, QuickTime, AVI, MKV |
| Image | JPEG, PNG, GIF, WebP, SVG |
| Audio | MP3, OGG, WAV, WebM |
| Document | PDF, Word, Excel, TXT, Markdown |
| Autre | Tous les types acceptés |

### Processus de chiffrement

1. Le fichier est lu côté client (ArrayBuffer)
2. Un IV (96 bits) aléatoire est généré
3. Chiffrement AES-256-GCM avec la clé dérivée du mot de passe maître
4. Le tag d'authentification (128 bits) est extrait
5. Les données chiffrées sont encodées en base64 et envoyées

```javascript
// Exemple de chiffrement
const iv = crypto.getRandomValues(new Uint8Array(12));
const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    encryptionKey,
    fileData
);
```

## 📥 Téléchargement et lecture

### Téléchargement

1. Récupération des données chiffrées depuis le serveur
2. Déchiffrement local avec la clé utilisateur
3. Création d'un Blob pour le téléchargement

### Lecture vidéo (Streaming)

Pour les vidéos, un système de streaming par chunks est utilisé :

1. Le client demande une plage de bytes (HTTP Range)
2. Le serveur retourne les données chiffrées correspondantes
3. Le client déchiffre le chunk et l'ajoute au buffer de lecture
4. Lecture fluide sans attendre le fichier complet

**Note** : Le streaming vidéo nécessite un déchiffrement efficace par chunks. Les headers HTTP incluent les métadonnées de chiffrement (IV, auth tag).

## 🗂️ Organisation

### Catégories

Les documents sont automatiquement catégorisés selon leur type MIME :

- `video` - Fichiers vidéo
- `image` - Images
- `audio` - Fichiers audio
- `document` - Documents texte/PDF
- `other` - Autres types

### Filtres disponibles

- Par catégorie
- Favoris uniquement
- Recherche par nom (déchiffré côté client)
- Tri par date, nom, taille

### Vignettes

Pour les images et vidéos, une vignette est générée automatiquement :

- **Images** - Redimensionnement à 200x200px max
- **Vidéos** - Capture de frame à 25% de la durée
- Chiffrement séparé de la vignette

## ⚙️ Configuration

### Variables d'environnement

```env
# Répertoire de stockage (par défaut: ./uploads)
UPLOAD_DIR=./uploads

# Taille maximale par fichier (en bytes, défaut: 500MB)
MAX_FILE_SIZE=524288000

# Pour S3 (optionnel, pour scalabilité) !! attention pas tres securiser mes moin de risque de perdre les fichiers !!
STORAGE_PROVIDER=s3
S3_ENDPOINT=https://s3.amazonaws.com
S3_BUCKET=mon-bucket
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
S3_REGION=us-east-1
```

### Limites

- **Taille max par fichier** : 500MB (configurable)
- **Nombre max de fichiers** : Illimité (dépend du stockage disque)
- **Types autorisés** : Tous (liste configurable côté serveur)

## 🚀 Utilisation de l'interface

### Navigation

1. Cliquez sur **"Documents"** dans le menu latéral
2. La vue affiche tous vos documents par défaut
3. Utilisez les onglets pour filtrer par catégorie

### Upload

**Méthode 1 - Bouton :**
1. Cliquez sur **"Ajouter un fichier"**
2. Sélectionnez le fichier
3. Confirmez le chiffrement et l'upload

**Méthode 2 - Drag & Drop :**
1. Glissez un fichier depuis votre ordinateur
2. Déposez-le sur la zone de documents
3. Confirmez l'upload

### Lecture

**Vidéos :**
- Cliquez sur la vignette pour ouvrir le lecteur
- Lecture en streaming (pas besoin d'attendre le téléchargement)
- Contrôles standards (play, pause, volume, plein écran)

**Images :**
- Cliquez pour voir en taille réelle
- Téléchargez pour obtenir l'original déchiffré

**Autres fichiers :**
- Téléchargement uniquement (pas de prévisualisation)

### Gestion

- **Favoris** - Cliquez sur l'étoile pour marquer/unmarquer
- **Téléchargement** - Bouton de téléchargement dans le menu
- **Suppression** - Suppression définitive après confirmation

## 🔧 Dépannage

### L'upload échoue

**Problème** : "Fichier trop volumineux"
- **Solution** : Augmentez `MAX_FILE_SIZE` dans `.env` ou compressez le fichier

**Problème** : "Type de fichier non autorisé"
- **Solution** : Vérifiez la liste `ALLOWED_MIME_TYPES` dans le code serveur

**Problème** : Timeout lors de l'upload
- **Solution** : Vérifiez votre connexion ou diminuez la taille du fichier

### La lecture vidéo ne fonctionne pas

**Problème** : Vidéo ne se lance pas
- **Causes possibles** :
  - Format non supporté par le navigateur
  - Corruption lors du chiffrement/déchiffrement
  - Clé de chiffrement incorrecte (session expirée)

**Solutions** :
1. Vérifiez que la session est déverrouillée
2. Essayez de télécharger et lire localement
3. Vérifiez les logs du navigateur (F12)

### Erreur de déchiffrement

**Symptôme** : "Failed to decrypt"
- **Cause** : La clé de chiffrement a changé ou est invalide
- **Solution** : Déverrouillez le coffre-fort avec votre mot de passe maître

## 💾 Stockage et persistance

### Docker

Par défaut, les uploads sont stockés dans un volume Docker :

```yaml
volumes:
  uploads_data:
```

Pour persister les données entre les recréations de conteneurs :

```yaml
volumes:
  uploads_data:
    driver: local
```

Pour monter un dossier local (développement) :

```yaml
volumes:
  - ./uploads:/app/uploads
```

### S3 (Production)

Pour une scalabilité accrue, configurez le stockage S3 :

1. Créez un bucket S3
2. Configurez les variables d'environnement
3. Les fichiers seront stockés sur S3 au lieu du filesystem local

## 📊 Surveillance

### Métriques disponibles

- Nombre total de fichiers
- Espace disque utilisé
- Répartition par catégorie
- Activité (uploads/téléchargements via audit logs)

### Audit logs

Les actions suivantes sont loguées :
- `DOCUMENT_UPLOADED` - Upload d'un fichier
- `DOCUMENT_DOWNLOADED` - Téléchargement
- `DOCUMENT_DELETED` - Suppression
- `DOCUMENT_UPDATED` - Modification des métadonnées
- `DOCUMENTS_BATCH_DELETED` - Suppression par lot

## 🛡️ Bonnes pratiques

1. **Taille des fichiers** - Évitez les fichiers > 100MB pour une meilleure expérience
2. **Formats** - Préférez les formats web (MP4, WebM) pour les vidéos
3. **Organisation** - Utilisez les catégories et favoris pour vous y retrouver
4. **Sauvegarde** - Le volume `uploads_data` doit être inclus dans vos backups
5. **Clé maître** - Sans le mot de passe maître, les fichiers sont irrécupérables

---

**Note importante** : Comme pour les mots de passe, la perte du mot de passe maître entraîne la perte irréversible de tous les documents stockés. Assurez-vous de le conserver en lieu sûr !
