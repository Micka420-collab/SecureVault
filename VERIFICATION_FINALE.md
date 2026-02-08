# ✅ Vérification Finale - Avant Premier Démarrage

## 🔎 Liste de contrôle (à faire sur Ubuntu)

### Étape 1: Préparation système
```bash
# Vérifier Ubuntu version
lsb_release -a
# Doit afficher Ubuntu 20.04+ (focal ou jammy)

# Vérifier Docker
sudo docker --version
# Doit afficher Docker 20.10+

# Vérifier Docker Compose
docker compose version || docker-compose --version
# Doit afficher la version
```

### Étape 2: Vérifier les fichiers critiques
```bash
# Vérifier que tous les fichiers sont présents
ls -la backend/Dockerfile
ls -la backend/entrypoint.sh
ls -la frontend/Dockerfile
ls -la docker-compose.yml
ls -la start-ubuntu.sh
```

### Étape 3: Vérifier l'absence de fuites
```bash
# Chercher des références externes dans le code
if grep -r "api.pwnedpasswords.com\|google.com/s2/favicons" frontend/src/ 2>/dev/null; then
    echo "❌ ERREUR: Fuites trouvées!"
else
    echo "✅ OK: Aucune fuite détectée"
fi
```

### Étape 4: Rendre exécutables
```bash
chmod +x *.sh
chmod +x backend/entrypoint.sh
chmod +x scripts/*.sh 2>/dev/null || true
```

## 🚀 Commande de démarrage

```bash
# Méthode recommandée:
./start-ubuntu.sh

# Ou étape par étape:
./check-and-fix.sh    # Vérification
./test-offline.sh     # Test offline
./start-ubuntu.sh     # Démarrage
```

## 🧪 Tests post-démarrage

### Test 1: Connexion
```bash
# Dans un navigateur sur Ubuntu
# Aller à: http://localhost:8080

# Vérifier que la page charge sans erreur réseau (F12 > Network)
# Aucune requête vers l'extérieur ne doit apparaître
```

### Test 2: Création compte
```bash
# Créer un compte test
# Email: test@local
# Mot de passe: UnMotDePasseFort123!

# Vérifier que ça fonctionne
```

### Test 3: Vérification offline password
```bash
# Essayer de créer un mot de passe faible: "password123"
# Vérifier qu'il est détecté comme compromis
# (sans connexion internet!)
```

### Test 4: Netstat (vérification réseau)
```bash
# Dans un terminal séparé:
sudo netstat -tunap | grep ESTABLISHED | grep -v 127.0.0.1 | grep -v ::1

# Ne doit rien afficher (pas de connexions externes)
```

## 🐛 Dépannage rapide

### Problème: "docker: command not found"
```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Se déconnecter et reconnecter
```

### Problème: "port already in use"
```bash
# Trouver le processus
sudo lsof -i :8080
# ou
sudo lsof -i :3001

# Tuer le processus
sudo kill -9 <PID>

# Ou changer le port dans .env
```

### Problème: "database connection error"
```bash
# Voir les logs
docker compose logs postgres --tail=50

# Si besoin, reset complet (perd les données):
docker compose down -v
docker compose up --build -d
```

### Problème: "backend unhealthy"
```bash
# Voir les logs détaillés
docker compose logs backend --tail=100

# Vérifier que Prisma est généré
cd backend && npx prisma generate
```

## 📊 Commandes de monitoring

```bash
# Voir tous les logs
docker compose logs -f

# Voir un service spécifique
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Stats en temps réel
docker stats

# Health check
curl http://localhost:3001/api/health
```

## 🛑 Arrêt propre

```bash
# Arrêter les services
docker compose down

# Arrêter ET supprimer les volumes (perd les données!)
docker compose down -v
```

## 🔐 Vérification sécurité finale

```bash
# 1. Déconnecter le câble WiFi/Ethernet

# 2. Vérifier qu'on est bien offline
ping google.com
# Doit afficher "Destination Unreachable" ou similar

# 3. Démarrer SecureVault
./start-ubuntu.sh

# 4. Tester toutes les fonctionnalités
# - Création compte
# - Ajout mot de passe
# - Vérification password faible
# - Déconnexion/Reconnexion

# 5. Vérifier qu'aucune erreur réseau n'apparaît
# (F12 > Console dans le navigateur)

# 6. Reconnecter Internet
# SecureVault doit continuer de fonctionner normalement
```

## ✅ Checklist finale

- [ ] Docker installé et fonctionnel
- [ ] Ports 8080 et 3001 libres
- [ ] Fichiers présents (Dockerfile, docker-compose.yml, etc.)
- [ ] Scripts exécutables
- [ ] Aucune fuite détectée (test-offline.sh)
- [ ] Démarrage réussi
- [ ] Page web accessible
- [ ] Création compte OK
- [ ] Test en vrai mode offline (débrancher câble) OK
- [ ] Aucune erreur dans la console navigateur

---

**Si tous les points sont cochés, SecureVault est prêt! 🎉**

En cas de problème, consultez:
- `docker compose logs` pour les erreurs
- `OFFLINE-SECURITY.md` pour la sécurité
- `ARCHITECTURE.md` pour la structure
