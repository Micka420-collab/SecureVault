#!/bin/bash

# ════════════════════════════════════════════════════════════════════════════
# ███████╗███████╗ ██████╗██╗   ██╗██████╗ ███████╗██╗   ██╗ █████╗ ██╗     
# ██╔════╝██╔════╝██╔════╝██║   ██║██╔══██╗██╔════╝██║   ██║██╔══██╗██║     
# ███████╗█████╗  ██║     ██║   ██║██████╔╝█████╗  ██║   ██║███████║██║     
# ╚════██║██╔══╝  ██║     ██║   ██║██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══██║██║     
# ███████║███████╗╚██████╗╚██████╔╝██║  ██║███████╗ ╚████╔╝ ██║  ██║███████╗
# ╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝
# ════════════════════════════════════════════════════════════════════════════
#                         SecureVault by Nextendo x Micka Delcato
#                    https://github.com/Micka420-collab/SecureVault.git
# ════════════════════════════════════════════════════════════════════════════

VERSION="2.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -e

# ════════════════════════════════════════════════════════════════════════════
# CONFIGURATION DES COULEURS ET STYLES
# ════════════════════════════════════════════════════════════════════════════

BLACK='\033[0;30m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
GRAY='\033[0;37m'
DARK_GRAY='\033[1;30m'
BOLD='\033[1m'
DIM='\033[2m'
ITALIC='\033[3m'
UNDERLINE='\033[4m'
NC='\033[0m'

# ════════════════════════════════════════════════════════════════════════════
# VARIABLES GLOBALES (peuvent être surchargées par arguments)
# ════════════════════════════════════════════════════════════════════════════

SILENT_MODE=false
DRY_RUN=false
ENABLE_SSL=false
DOMAIN=""
CONFIGURE_FIREWALL=false
CREATE_SERVICE=false
BACKUP_BEFORE_UPDATE=false
DATABASE_TYPE="sqlite"
STORAGE_TYPE="local"
AUTO_UPDATE="none"
ADMIN_EMAIL=""
LANG="${LANG:-en}"

FRONTEND_PORT=8080
EMERGENCY_EXPIRY_HOURS=168
INSTALL_MODE="production"

# Fichiers de log
LOG_FILE="/tmp/securevault-install-$(date +%Y%m%d-%H%M%S).log"

# ═══════════════════════════════════════════════════════════════════════════════
# FONCTIONS D'AFFICHAGE
# ═══════════════════════════════════════════════════════════════════════════════

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

clear_screen() {
    clear
}

show_banner() {
    echo -e "${CYAN}"
    echo '    ╔═══════════════════════════════════════════════════════════════════════════╗'
    echo '    ║                                                                           ║'
    echo '    ║   ███████╗███████╗ ██████╗██╗   ██╗██████╗ ███████╗██╗   ██╗ █████╗ ██╗   ║'
    echo '    ║   ██╔════╝██╔════╝██╔════╝██║   ██║██╔══██╗██╔════╝██║   ██║██╔══██╗██║   ║'
    echo '    ║   ███████╗█████╗  ██║     ██║   ██║██████╔╝█████╗  ██║   ██║███████║██║   ║'
    echo '    ║   ╚════██║██╔══╝  ██║     ██║   ██║██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══██║██║   ║'
    echo '    ║   ███████║███████╗╚██████╗╚██████╔╝██║  ██║███████╗ ╚████╔╝ ██║  ██║████║ ║'
    echo '    ║   ╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝  ╚═╝════╝ ║'
    echo '    ║                                                                           ║'
    echo '    ║                     🔐 PASSWORD MANAGER & SECURE VAULT 🔐                ║'
    echo '    ║                                                                           ║'
    echo '    ║              '${MAGENTA}'By Nextendo X Micka Delcato'${CYAN}'            ║'
    echo '    ║                                                                           ║'
    echo '    ╚═══════════════════════════════════════════════════════════════════════════╝'
    echo -e "${NC}"
    echo -e "${GRAY}    Version: $VERSION | Installation Script${NC}"
    echo ""
}

separator() {
    echo -e "${DARK_GRAY}═══════════════════════════════════════════════════════════════════════════════${NC}"
}

info() {
    echo -e "${CYAN}ℹ️  ${NC}$1"
    log "[INFO] $1"
}

success() {
    echo -e "${GREEN}✅ ${NC}$1"
    log "[SUCCESS] $1"
}

warning() {
    echo -e "${YELLOW}⚠️  ${NC}$1"
    log "[WARNING] $1"
}

error() {
    echo -e "${RED}❌ ${NC}$1"
    log "[ERROR] $1"
}

ask() {
    echo -e "${MAGENTA}❓ ${NC}$1"
}

# ═══════════════════════════════════════════════════════════════════════════════
# GESTION DES ARGUMENTS
# ═══════════════════════════════════════════════════════════════════════════════

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --silent)
                SILENT_MODE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --port=*)
                FRONTEND_PORT="${1#*=}"
                shift
                ;;
            --domain=*)
                DOMAIN="${1#*=}"
                shift
                ;;
            --enable-ssl)
                ENABLE_SSL=true
                shift
                ;;
            --configure-firewall)
                CONFIGURE_FIREWALL=true
                shift
                ;;
            --create-service)
                CREATE_SERVICE=true
                shift
                ;;
            --backup-before-update)
                BACKUP_BEFORE_UPDATE=true
                shift
                ;;
            --database=*)
                DATABASE_TYPE="${1#*=}"
                shift
                ;;
            --storage=*)
                STORAGE_TYPE="${1#*=}"
                shift
                ;;
            --auto-update=*)
                AUTO_UPDATE="${1#*=}"
                shift
                ;;
            --email=*)
                ADMIN_EMAIL="${1#*=}"
                shift
                ;;
            --lang=*)
                LANG="${1#*=}"
                shift
                ;;
            --mode=*)
                INSTALL_MODE="${1#*=}"
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                warning "Argument inconnu: $1"
                shift
                ;;
        esac
    done
}

show_help() {
    cat << 'EOF'
Usage: ./install.sh [OPTIONS]

🔐 SecureVault Installer - By Nextendo X Micka Delcato

OPTIONS:
  --silent                    Mode non-interactif (automatique)
  --dry-run                   Simulation sans installation
  --port=PORT                 Port HTTP (défaut: 8080)
  --domain=DOMAIN             Nom de domaine pour SSL
  --enable-ssl                Activer HTTPS avec Let's Encrypt
  --configure-firewall        Configurer UFW/Iptables
  --create-service            Créer service systemd
  --backup-before-update      Backup avant mise à jour
  --database=TYPE             sqlite|postgres|mysql (défaut: sqlite)
  --storage=TYPE              local|s3|minio (défaut: local)
  --auto-update=TYPE          none|security|all (défaut: none)
  --email=EMAIL               Email admin pour notifications
  --lang=LANG                 Langue: fr|en|es|de (défaut: auto)
  --mode=MODE                 production|development (défaut: production)
  --help, -h                  Afficher cette aide

EXEMPLES:
  ./install.sh                                    # Installation interactive
  ./install.sh --silent --port=8080               # Mode silencieux
  ./install.sh --domain=vault.example.com --enable-ssl --create-service
  ./install.sh --dry-run                          # Test sans installer

EOF
}

# ═══════════════════════════════════════════════════════════════════════════════
# MODE DRY-RUN
# ═══════════════════════════════════════════════════════════════════════════════

dry_run_report() {
    echo -e "\n${BOLD}${CYAN}🧪 MODE SIMULATION (DRY-RUN)${NC}\n"
    echo -e "${GRAY}Cette exécution ne modifiera pas votre système.${NC}\n"
    
    echo -e "${BOLD}Configuration qui serait appliquée :${NC}"
    echo ""
    echo -e "  ${CYAN}Port HTTP:${NC}         $FRONTEND_PORT"
    echo -e "  ${CYAN}Port HTTPS:${NC}        $([ "$ENABLE_SSL" = true ] && echo "443 (SSL activé)" || echo "Non configuré")"
    echo -e "  ${CYAN}Domaine:${NC}           ${DOMAIN:-"Non configuré"}"
    echo -e "  ${CYAN}Mode:${NC}              $INSTALL_MODE"
    echo -e "  ${CYAN}Base de données:${NC}   $DATABASE_TYPE"
    echo -e "  ${CYAN}Stockage:${NC}          $STORAGE_TYPE"
    echo -e "  ${CYAN}Pare-feu:${NC}          $([ "$CONFIGURE_FIREWALL" = true ] && echo "Configurer" || echo "Ignorer")"
    echo -e "  ${CYAN}Service systemd:${NC}   $([ "$CREATE_SERVICE" = true ] && echo "Créer" || echo "Ignorer")"
    echo -e "  ${CYAN}Auto-update:${NC}      $AUTO_UPDATE"
    echo ""
    
    # Vérifications qui seraient faites
    echo -e "${BOLD}Vérifications qui seraient effectuées :${NC}"
    
    if command -v docker &> /dev/null; then
        success "Docker serait détecté"
    else
        error "Docker MANQUANT - l'installation échouerait"
    fi
    
    if [ "$EUID" -eq 0 ] && [ "$FRONTEND_PORT" -lt 1024 ]; then
        warning "Root requis pour le port $FRONTEND_PORT"
    fi
    
    if [ "$ENABLE_SSL" = true ] && [ -z "$DOMAIN" ]; then
        error "Domaine requis pour SSL"
    fi
    
    echo ""
    echo -e "${GREEN}✅ Simulation terminée. Aucune modification effectuée.${NC}"
    echo -e "${GRAY}Pour installer réellement, relancez sans --dry-run${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# SAUVEGARDE ET RESTAURATION
# ═══════════════════════════════════════════════════════════════════════════════

create_backup() {
    local backup_name="securevault-backup-$(date +%Y%m%d-%H%M%S)"
    local backup_dir="/tmp/$backup_name"
    
    info "Création du backup: $backup_name"
    
    mkdir -p "$backup_dir"
    
    # Sauvegarder les données importantes
    if [ -f ".env" ]; then
        cp .env "$backup_dir/"
        success "Configuration sauvegardée"
    fi
    
    if [ -d "backend/prisma" ]; then
        cp -r backend/prisma "$backup_dir/"
        success "Schéma DB sauvegardé"
    fi
    
    if [ -d "uploads" ]; then
        cp -r uploads "$backup_dir/" 2>/dev/null || warning "Impossible de sauvegarder uploads"
    fi
    
    # Créer l'archive
    tar -czf "${backup_name}.tar.gz" -C /tmp "$backup_name"
    rm -rf "$backup_dir"
    
    success "Backup créé: ${backup_name}.tar.gz"
    echo "$(pwd)/${backup_name}.tar.gz"
}

restore_backup() {
    local backup_file="$1"
    
    if [ ! -f "$backup_file" ]; then
        error "Fichier de backup non trouvé: $backup_file"
        return 1
    fi
    
    info "Restauration depuis: $backup_file"
    
    tar -xzf "$backup_file" -C /tmp/
    local backup_dir="/tmp/$(basename "$backup_file" .tar.gz)"
    
    if [ -f "$backup_dir/.env" ]; then
        cp "$backup_dir/.env" .
        success "Configuration restaurée"
    fi
    
    rm -rf "$backup_dir"
}

# ═══════════════════════════════════════════════════════════════════════════════
# SERVICE SYSTEMD
# ═══════════════════════════════════════════════════════════════════════════════

create_systemd_service() {
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] Service systemd serait créé"
        return 0
    fi
    
    if [ "$EUID" -ne 0 ]; then
        warning "Service systemd nécessite root. Ignoré."
        return 1
    fi
    
    local service_name="securevault"
    local service_file="/etc/systemd/system/${service_name}.service"
    
    info "Création du service systemd: $service_name"
    
    cat > "$service_file" << EOF
[Unit]
Description=SecureVault Password Manager
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$SCRIPT_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
ExecReload=/usr/bin/docker compose restart

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl daemon-reload
    systemctl enable "$service_name"
    
    success "Service créé: systemctl start|stop|restart $service_name"
}

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION PARE-FEU
# ═══════════════════════════════════════════════════════════════════════════════

configure_firewall() {
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] Pare-feu serait configuré"
        return 0
    fi
    
    if [ "$EUID" -ne 0 ]; then
        warning "Configuration pare-feu nécessite root. Ignoré."
        return 1
    fi
    
    info "Configuration du pare-feu..."
    
    if command -v ufw &> /dev/null; then
        ufw default deny incoming
        ufw default allow outgoing
        ufw allow "$FRONTEND_PORT/tcp"
        ufw allow 3001/tcp
        
        if [ "$ENABLE_SSL" = true ]; then
            ufw allow 443/tcp
            ufw allow 80/tcp
        fi
        
        ufw --force enable
        success "UFW configuré"
        
    elif command -v firewall-cmd &> /dev/null; then
        firewall-cmd --permanent --add-port="$FRONTEND_PORT/tcp"
        firewall-cmd --permanent --add-port=3001/tcp
        
        if [ "$ENABLE_SSL" = true ]; then
            firewall-cmd --permanent --add-service=https
            firewall-cmd --permanent --add-service=http
        fi
        
        firewall-cmd --reload
        success "FirewallD configuré"
        
    else
        warning "Aucun pare-feu détecté (UFW/FirewallD)"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# SSL / LET'S ENCRYPT
# ═══════════════════════════════════════════════════════════════════════════════

setup_ssl() {
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] SSL serait configuré pour: $DOMAIN"
        return 0
    fi
    
    if [ "$EUID" -ne 0 ]; then
        error "Configuration SSL nécessite root"
        return 1
    fi
    
    if [ -z "$DOMAIN" ]; then
        error "Nom de domaine requis pour SSL (--domain=...)"
        return 1
    fi
    
    info "Configuration SSL pour: $DOMAIN"
    
    # Installer certbot si nécessaire
    if ! command -v certbot &> /dev/null; then
        info "Installation de Certbot..."
        apt-get update
        apt-get install -y certbot
    fi
    
    # Générer le certificat
    certbot certonly --standalone -d "$DOMAIN" --agree-tos --non-interactive --email "${ADMIN_EMAIL:-admin@$DOMAIN}"
    
    # Configurer le renouvellement auto
    (crontab -l 2>/dev/null; echo "0 12 * * * certbot renew --quiet") | crontab -
    
    success "SSL configuré pour $DOMAIN"
    success "Renouvellement automatique activé"
}

# ═══════════════════════════════════════════════════════════════════════════════
# VÉRIFICATIONS PRÉALABLES
# ═══════════════════════════════════════════════════════════════════════════════

check_prerequisites() {
    if [ "$SILENT_MODE" = false ]; then
        echo -e "\n${BOLD}${CYAN}🔍 Vérification des prérequis...${NC}\n"
    fi
    
    log "Début vérification prérequis"
    
    # Vérifier Docker
    if ! command -v docker &> /dev/null; then
        error "Docker n'est pas installé !"
        echo -e "${YELLOW}📥 Installation:${NC} curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    success "Docker: $(docker --version | cut -d' ' -f3 | tr -d ',')"
    
    # Vérifier Docker Compose
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
        success "Docker Compose détecté"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
        success "Docker Compose (plugin) détecté"
    else
        error "Docker Compose n'est pas installé !"
        exit 1
    fi
    
    # Vérifier si Docker est démarré
    if ! docker info &> /dev/null; then
        error "Docker n'est pas démarré !"
        echo -e "${YELLOW}💡 Démarrez Docker:${NC} sudo systemctl start docker"
        exit 1
    fi
    success "Docker est opérationnel"
    
    # Vérifications pour SSL
    if [ "$ENABLE_SSL" = true ] && [ -z "$DOMAIN" ]; then
        error "--domain est requis avec --enable-ssl"
        exit 1
    fi
    
    log "Vérifications prérequis OK"
}

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION INTERACTIVE (si pas en mode silencieux)
# ═══════════════════════════════════════════════════════════════════════════════

interactive_config() {
    if [ "$SILENT_MODE" = true ]; then
        info "Mode silencieux: configuration automatique"
        return 0
    fi
    
    echo -e "\n${BOLD}${CYAN}⚙️  Configuration de SecureVault${NC}\n"
    
    # Port HTTP
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  🌐 PORT HTTP                                              ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GRAY}Par défaut: 8080 (pas besoin de root)${NC}"
    echo ""
    
    read -p "$(echo -e "${CYAN}Port [80/8080/3000/...] (défaut: 8080): ${NC}")" input_port
    if [ -n "$input_port" ]; then
        FRONTEND_PORT="$input_port"
    fi
    
    if [ "$FRONTEND_PORT" -lt 1024 ] && [ "$EUID" -ne 0 ]; then
        warning "Port $FRONTEND_PORT nécessite root. Utilisez sudo ou choisissez un port > 1024."
    fi
    
    # SSL
    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  🔒 CONFIGURATION SSL                                      ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    read -p "$(echo -e "${CYAN}Activer HTTPS avec Let's Encrypt? [O/n]: ${NC}")" ssl_choice
    if [[ "$ssl_choice" =~ ^[Oo]$ ]] || [ -z "$ssl_choice" ]; then
        ENABLE_SSL=true
        read -p "$(echo -e "${CYAN}Nom de domaine (ex: vault.example.com): ${NC}")" DOMAIN
        read -p "$(echo -e "${CYAN}Email pour Let's Encrypt: ${NC}")" ADMIN_EMAIL
    fi
    
    # Options avancées
    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║  ⚙️  OPTIONS AVANCÉES                                      ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    read -p "$(echo -e "${CYAN}Configurer le pare-feu? [O/n]: ${NC}")" fw_choice
    if [[ "$fw_choice" =~ ^[Oo]$ ]] || [ -z "$fw_choice" ]; then
        CONFIGURE_FIREWALL=true
    fi
    
    read -p "$(echo -e "${CYAN}Créer un service systemd (démarrage auto)? [O/n]: ${NC}")" service_choice
    if [[ "$service_choice" =~ ^[Oo]$ ]] || [ -z "$service_choice" ]; then
        CREATE_SERVICE=true
    fi
    
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# GÉNÉRATION DES SECRETS ET FICHIER ENV
# ═══════════════════════════════════════════════════════════════════════════════

generate_secrets() {
    info "🔐 Génération des secrets de sécurité..."
    
    if command -v openssl &> /dev/null; then
        # Générer des secrets de 64 octets (86 caractères base64) pour plus de sécurité
        JWT_SECRET=$(openssl rand -base64 64)
        SESSION_SECRET=$(openssl rand -base64 64)
        EMAIL_KEY=$(openssl rand -base64 32)
        DB_PASSWORD="vault_$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20)"
    else
        # Fallback avec /dev/urandom si openssl n'est pas disponible
        JWT_SECRET=$(head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9+/' | head -c 86)
        SESSION_SECRET=$(head -c 64 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9+/' | head -c 86)
        EMAIL_KEY=$(head -c 32 /dev/urandom | base64)
        DB_PASSWORD="vault_$(head -c 24 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 20)"
    fi
    
    # Vérifier que les secrets ont été générés correctement
    if [ -z "$JWT_SECRET" ] || [ -z "$SESSION_SECRET" ] || [ -z "$EMAIL_KEY" ]; then
        error "Échec de la génération des secrets"
        exit 1
    fi
    
    success "Secrets générés avec succès"
    log "Secrets générés (longueurs: JWT=${#JWT_SECRET}, SESSION=${#SESSION_SECRET})"
}

create_env_file() {
    info "Création du fichier de configuration..."
    
    cat > .env << EOF
# ═══════════════════════════════════════════════════════════════════════════════
# SECUREVAULT CONFIGURATION - Generated by install.sh v$VERSION
# ═══════════════════════════════════════════════════════════════════════════════

# ───────────────────────────────────────────────────────────────────────────────
# Database Configuration
# ───────────────────────────────────────────────────────────────────────────────
DB_USER=vault
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=securevault

# ───────────────────────────────────────────────────────────────────────────────
# Security Keys (Auto-generated - KEEP SECRET)
# ───────────────────────────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
REAL_EMAIL_ENCRYPTION_KEY=${EMAIL_KEY}

# ───────────────────────────────────────────────────────────────────────────────
# Email Configuration
# ───────────────────────────────────────────────────────────────────────────────
MAIL_DOMAIN=${DOMAIN:-localhost}
ADMIN_EMAIL=${ADMIN_EMAIL:-}

# ───────────────────────────────────────────────────────────────────────────────
# Frontend Configuration
# ───────────────────────────────────────────────────────────────────────────────
VITE_API_URL=http://localhost:3001
FRONTEND_PORT=${FRONTEND_PORT}
FRONTEND_SSL_PORT=$((FRONTEND_PORT + 1))

# ───────────────────────────────────────────────────────────────────────────────
# SSL Configuration
# ───────────────────────────────────────────────────────────────────────────────
ENABLE_SSL=${ENABLE_SSL}
DOMAIN=${DOMAIN}

# ───────────────────────────────────────────────────────────────────────────────
# CORS Configuration
# ───────────────────────────────────────────────────────────────────────────────
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:${FRONTEND_PORT}

# ───────────────────────────────────────────────────────────────────────────────
# Emergency Access Settings
# ───────────────────────────────────────────────────────────────────────────────
EMERGENCY_ACCESS_EXPIRY_HOURS=${EMERGENCY_EXPIRY_HOURS}

# ───────────────────────────────────────────────────────────────────────────────
# Installation Settings
# ───────────────────────────────────────────────────────────────────────────────
NODE_ENV=${INSTALL_MODE}
INSTALL_DATE=$(date -Iseconds)
INSTALL_VERSION=${VERSION}

# ───────────────────────────────────────────────────────────────────────────────
# Upload Configuration
# ───────────────────────────────────────────────────────────────────────────────
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=524288000
EOF
    
    chmod 600 .env
    success "Fichier .env créé ($(pwd)/.env)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# INSTALLATION DOCKER
# ═══════════════════════════════════════════════════════════════════════════════

install_docker() {
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] Docker serait construit et démarré"
        return 0
    fi
    
    info "Construction des images Docker..."
    $COMPOSE_CMD build --no-cache
    
    info "Démarrage des services..."
    $COMPOSE_CMD up -d
    
    # Attendre le démarrage
    echo -ne "${CYAN}Initialisation...${NC} "
    for i in {1..5}; do
        echo -ne "${GREEN}▓${NC}"
        sleep 1
    done
    echo ""
    
    success "Services démarrés"
}

# ═══════════════════════════════════════════════════════════════════════════════
# HEALTH CHECK COMPLET
# ═══════════════════════════════════════════════════════════════════════════════

health_check() {
    info "Vérification de l'installation..."
    
    local retries=30
    local count=0
    local all_ok=true
    
    # Test API
    while [ $count -lt $retries ]; do
        if curl -s http://localhost:3001/api/health &> /dev/null; then
            success "API: OK"
            local version=$(curl -s http://localhost:3001/api/health | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
            info "Version: $version"
            break
        fi
        ((count++))
        sleep 2
    done
    
    if [ $count -eq $retries ]; then
        error "API ne répond pas"
        all_ok=false
    fi
    
    # Test Frontend
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:$FRONTEND_PORT" | grep -q "200\|301\|302"; then
        success "Frontend: OK (port $FRONTEND_PORT)"
    else
        warning "Frontend: pas encore prêt"
    fi
    
    # Test Base de données
    if docker compose exec -T postgres pg_isready -U vault &>/dev/null || \
       docker compose ps | grep -q "postgres.*Up"; then
        success "Base de données: OK"
    else
        warning "Base de données: vérification impossible"
    fi
    
    if [ "$all_ok" = true ]; then
        return 0
    else
        return 1
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# AFFICHAGE DU RÉCAPITULATIF
# ═══════════════════════════════════════════════════════════════════════════════

show_summary() {
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                                           ║${NC}"
    echo -e "${GREEN}║          🎉 INSTALLATION TERMINÉE AVEC SUCCÈS ! 🎉                        ║${NC}"
    echo -e "${GREEN}║                                                                           ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    echo -e "${BOLD}${CYAN}📱 Accès à l'application :${NC}"
    echo ""
    
    if [ "$ENABLE_SSL" = true ] && [ -n "$DOMAIN" ]; then
        echo -e "  ${GREEN}➤${NC} HTTPS: ${UNDERLINE}${CYAN}https://$DOMAIN${NC}"
    fi
    
    echo -e "  ${GREEN}➤${NC} HTTP:  ${UNDERLINE}${CYAN}http://localhost:$FRONTEND_PORT${NC}"
    echo -e "  ${GREEN}➤${NC} API:   ${UNDERLINE}${CYAN}http://localhost:3001${NC}"
    echo ""
    
    echo -e "${BOLD}${CYAN}🔧 Commandes utiles :${NC}"
    echo ""
    echo -e "  ${GRAY}# Voir les logs${NC}"
    echo -e "  ${CYAN}docker compose logs -f${NC}"
    echo ""
    echo -e "  ${GRAY}# Arrêter${NC}"
    echo -e "  ${CYAN}docker compose down${NC}"
    echo ""
    
    if [ "$CREATE_SERVICE" = true ]; then
        echo -e "  ${GRAY}# Gestion du service${NC}"
        echo -e "  ${CYAN}sudo systemctl start|stop|restart securevault${NC}"
        echo ""
    fi
    
    echo -e "${BOLD}${CYAN}🔐 Configuration :${NC}"
    echo ""
    echo -e "  ${GRAY}• Mode:${NC}              $INSTALL_MODE"
    echo -e "  ${GRAY}• Port HTTP:${NC}         $FRONTEND_PORT"
    echo -e "  ${GRAY}• SSL:${NC}               $([ "$ENABLE_SSL" = true ] && echo "Activé ($DOMAIN)" || echo "Non activé")"
    echo -e "  ${GRAY}• Pare-feu:${NC}          $([ "$CONFIGURE_FIREWALL" = true ] && echo "Configuré" || echo "Non configuré")"
    echo -e "  ${GRAY}• Service:${NC}           $([ "$CREATE_SERVICE" = true ] && echo "Créé" || echo "Non créé")"
    echo -e "  ${GRAY}• Fichier log:${NC}       $LOG_FILE"
    echo ""
    
    echo -e "${BOLD}${YELLOW}⚠️  IMPORTANT :${NC}"
    echo -e "   Votre mot de passe maître n'est ${BOLD}JAMAIS${NC} stocké sur le serveur."
    echo -e "   ${RED}Si vous l'oubliez, vos données sont irrécupérables !!!${NC}"
    echo ""
    
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "                 ${MAGENTA}🔐 SecureVault by Nextendo X Micka Delcato 🔐${NC}"
    echo -e "            ${CYAN}https://github.com/Micka420-collab/SecureVault.git${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════════════${NC}}"
    echo ""
}

# ═══════════════════════════════════════════════════════════════════════════════
# FONCTION PRINCIPALE
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    # Parser les arguments
    parse_arguments "$@"
    
    # Mode dry-run
    if [ "$DRY_RUN" = true ]; then
        show_banner
        dry_run_report
        exit 0
    fi
    
    # Affichage
    if [ "$SILENT_MODE" = false ]; then
        clear_screen
        show_banner
    fi
    
    # Sauvegarde si demandé
    if [ "$BACKUP_BEFORE_UPDATE" = true ] && [ -f ".env" ]; then
        create_backup
    fi
    
    # Exécution
    check_prerequisites
    interactive_config
    generate_secrets
    create_env_file
    
    # Actions optionnelles
    if [ "$CONFIGURE_FIREWALL" = true ]; then
        configure_firewall
    fi
    
    if [ "$ENABLE_SSL" = true ]; then
        setup_ssl
    fi
    
    install_docker
    health_check
    
    if [ "$CREATE_SERVICE" = true ]; then
        create_systemd_service
    fi
    
    show_summary
}

# Gestion des erreurs
trap 'error "Une erreur est survenue. Consultez: $LOG_FILE"' ERR

# Lancer
main "$@"

exit 0
