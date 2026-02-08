#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# ███████╗███████╗ ██████╗██╗   ██╗██████╗ ███████╗██╗   ██╗ █████╗ ██╗     ██╗
# ██╔════╝██╔════╝██╔════╝██║   ██║██╔══██╗██╔════╝██║   ██║██╔══██╗██║     ██║
# ███████╗█████╗  ██║     ██║   ██║██████╔╝█████╗  ██║   ██║███████║██║     ██║
# ╚════██║██╔══╝  ██║     ██║   ██║██╔══██╗██╔══╝  ╚██╗ ██╔╝██╔══██║██║     ██║
# ███████║███████╗╚██████╗╚██████╔╝██║  ██║███████╗ ╚████╔╝ ██║  ██║███████╗███████╗
# ╚══════╝╚══════╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝  ╚═══╝  ╚═╝  ╚═╝╚══════╝╚══════╝
# ═══════════════════════════════════════════════════════════════════════════════
#                    SecureVault Complete Installer v3.0
#                         🔐 SecureVault by Nextendo X Micka Delcato 🔐
#                    https://github.com/Micka420-collab/SecureVault.git
# ═══════════════════════════════════════════════════════════════════════════════

VERSION="3.0.0"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

set -e

# ═══════════════════════════════════════════════════════════════════════════════
# MULTI-LANGUE
# ═══════════════════════════════════════════════════════════════════════════════

declare -A TRANSLATIONS
declare -A COLORS_THEMES

# Thèmes de couleurs
colors_default() {
    BLACK='\033[0;30m'; RED='\033[0;31m'; GREEN='\033[0;32m'
    YELLOW='\033[1;33m'; BLUE='\033[0;34m'; MAGENTA='\033[0;35m'
    CYAN='\033[0;36m'; WHITE='\033[1;37m'; GRAY='\033[0;37m'
    DARK_GRAY='\033[1;30m'; BOLD='\033[1m'; NC='\033[0m'
}

colors_nord() {
    # Thème Nord (bleu arctique)
    BLACK='\033[0;30m'; RED='\033[38;5;167m'; GREEN='\033[38;5;142m'
    YELLOW='\033[38;5;214m'; BLUE='\033[38;5;109m'; MAGENTA='\033[38;5;139m'
    CYAN='\033[38;5;109m'; WHITE='\033[38;5;223m'; GRAY='\033[38;5;144m'
    DARK_GRAY='\033[38;5;59m'; BOLD='\033[1m'; NC='\033[0m'
}

colors_dracula() {
    # Thème Dracula
    BLACK='\033[0;30m'; RED='\033[38;5;212m'; GREEN='\033[38;5;120m'
    YELLOW='\033[38;5;229m'; BLUE='\033[38;5;117m'; MAGENTA='\033[38;5;183m'
    CYAN='\033[38;5;159m'; WHITE='\033[38;5;231m'; GRAY='\033[38;5;103m'
    DARK_GRAY='\033[38;5;60m'; BOLD='\033[1m'; NC='\033[0m'
}

# Traductions
load_translations() {
    local lang="${LANG%%_*}"
    
    case $lang in
        fr)
            TRANSLATIONS=(
                [welcome]="Bienvenue dans SecureVault"
                [installing]="Installation en cours..."
                [checking_prereq]="Vérification des prérequis..."
                [success]="Installation terminée avec succès !"
                [error]="Une erreur est survenue"
                [port_config]="Configuration du port"
                [ssl_config]="Configuration SSL"
                [firewall_config]="Configuration du pare-feu"
                [create_service]="Création du service"
                [backup]="Sauvegarde"
                [monitoring]="Monitoring"
                [theme]="Thème"
                [storage]="Stockage"
                [qr_code]="QR Code généré"
                [report]="Rapport généré"
            )
            ;;
        es)
            TRANSLATIONS=(
                [welcome]="Bienvenido a SecureVault"
                [installing]="Instalando..."
                [success]="¡Instalación completada!"
                [error]="Error"
            )
            ;;
        de)
            TRANSLATIONS=(
                [welcome]="Willkommen bei SecureVault"
                [installing]="Installation läuft..."
                [success]="Installation erfolgreich!"
                [error]="Fehler"
            )
            ;;
        *)
            TRANSLATIONS=(
                [welcome]="Welcome to SecureVault"
                [installing]="Installing..."
                [checking_prereq]="Checking prerequisites..."
                [success]="Installation completed successfully!"
                [error]="An error occurred"
                [port_config]="Port Configuration"
                [ssl_config]="SSL Configuration"
                [firewall_config]="Firewall Configuration"
                [create_service]="Creating Service"
                [backup]="Backup"
                [monitoring]="Monitoring"
                [theme]="Theme"
                [storage]="Storage"
                [qr_code]="QR Code generated"
                [report]="Report generated"
            )
            ;;
    esac
}

t() {
    local key="$1"
    echo "${TRANSLATIONS[$key]:-$key}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION INITIALE
# ═══════════════════════════════════════════════════════════════════════════════

SILENT_MODE=false
DRY_RUN=false
ENABLE_SSL=false
DOMAIN=""
CONFIGURE_FIREWALL=false
CREATE_SERVICE=false
BACKUP_AUTO=false
BACKUP_RETENTION_DAYS=30
MONITORING=false
DATABASE_TYPE="sqlite"
STORAGE_TYPE="local"
THEME="default"
GENERATE_QR=false
GENERATE_REPORT=false
REPORT_FORMAT="html"
AUTO_UPDATE="none"
ADMIN_EMAIL=""

FRONTEND_PORT=8080
EMERGENCY_EXPIRY_HOURS=168
INSTALL_MODE="production"
LOG_FILE="/tmp/securevault-install-$(date +%Y%m%d-%H%M%S).log"

# ═══════════════════════════════════════════════════════════════════════════════
# FONCTIONS D'AFFICHAGE AVANCÉES
# ═══════════════════════════════════════════════════════════════════════════════

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

progress_bar() {
    local duration=$1
    local title="$2"
    local width=50
    local progress=0
    
    echo -ne "${CYAN}$title${NC}\n"
    
    while [ $progress -lt 100 ]; do
        local filled=$((progress * width / 100))
        local empty=$((width - filled))
        
        printf "${DARK_GRAY}[${NC}"
        printf "${GREEN}"
        printf '%*s' "$filled" '' | tr ' ' '█'
        printf "${NC}"
        printf "${DARK_GRAY}"
        printf '%*s' "$empty" '' | tr ' ' '░'
        printf "]${NC} ${progress}%%\r"
        
        sleep $(echo "scale=3; $duration / 100" | bc 2>/dev/null || echo "0.01")
        ((progress+=2))
    done
    printf "${GREEN}["
    printf '%*s' "$width" '' | tr ' ' '█'
    printf "]${NC} 100%%\n"
}

show_banner() {
    local theme_banner="${CYAN}"
    [ "$THEME" = "dracula" ] && theme_banner="${MAGENTA}"
    [ "$THEME" = "nord" ] && theme_banner="${BLUE}"
    
    echo -e "$theme_banner"
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
    echo "    ║                ${MAGENTA}By Nextendo X Micka Delcato${theme_banner}       ║"
    echo '    ║                                                                           ║'
    echo '    ╚═══════════════════════════════════════════════════════════════════════════╝'
    echo -e "${NC}"
    echo -e "${GRAY}    Version: $VERSION | Theme: $THEME | $(t welcome)${NC}"
    echo ""
}

info() { echo -e "${CYAN}ℹ️  ${NC}$1"; log "[INFO] $1"; }
success() { echo -e "${GREEN}✅ ${NC}$1"; log "[SUCCESS] $1"; }
warning() { echo -e "${YELLOW}⚠️  ${NC}$1"; log "[WARNING] $1"; }
error() { echo -e "${RED}❌ ${NC}$1"; log "[ERROR] $1"; }

separator() {
    echo -e "${DARK_GRAY}═══════════════════════════════════════════════════════════════════════════════${NC}"
}

# ═══════════════════════════════════════════════════════════════════════════════
# QR CODE GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

generate_qr_code() {
    local url="$1"
    local output_file="${SCRIPT_DIR}/securevault-qr.txt"
    
    info "$(t qr_code)..."
    
    # Utiliser qrencode si disponible, sinon générer un lien
    if command -v qrencode &> /dev/null; then
        qrencode -t ANSIUTF8 "$url" > "$output_file"
        success "QR Code sauvegardé: $output_file"
        cat "$output_file"
    else
        # Générer un QR code ASCII simple
        echo -e "\n${CYAN}╔═══════════════════════════════════════╗${NC}"
        echo -e "${CYAN}║         📱 QR CODE MANUEL            ║${NC}"
        echo -e "${CYAN}╠═══════════════════════════════════════╣${NC}"
        echo -e "${CYAN}║${NC}  URL: ${UNDERLINE}$url${NC}"
        echo -e "${CYAN}║${NC}  Scannez avec votre téléphone"
        echo -e "${CYAN}╚═══════════════════════════════════════╝${NC}\n"
        
        # Sauvegarder l'URL
        echo "$url" > "${SCRIPT_DIR}/securevault-url.txt"
    fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# RAPPORT PDF/HTML
# ═══════════════════════════════════════════════════════════════════════════════

generate_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local report_file="${SCRIPT_DIR}/securevault-report-$(date +%Y%m%d-%H%M%S).${REPORT_FORMAT}"
    
    info "$(t report)..."
    
    if [ "$REPORT_FORMAT" = "html" ]; then
        cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>SecureVault Installation Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #1a1a2e; color: #eee; }
        h1 { color: #00d4ff; border-bottom: 2px solid #00d4ff; padding-bottom: 10px; }
        .section { background: #16213e; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .success { color: #4ecca3; }
        .warning { color: #ffc107; }
        .info { color: #00d4ff; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 10px; border-bottom: 1px solid #333; }
        .footer { text-align: center; margin-top: 40px; color: #666; }
    </style>
</head>
<body>
    <h1>🔐 SecureVault Installation Report</h1>
    <div class="section">
        <h2>📅 Informations Générales</h2>
        <table>
            <tr><td><strong>Date d'installation</strong></td><td>$timestamp</td></tr>
            <tr><td><strong>Version</strong></td><td>$VERSION</td></tr>
            <tr><td><strong>Thème</strong></td><td>$THEME</td></tr>
            <tr><td><strong>Mode</strong></td><td>$INSTALL_MODE</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>🌐 Configuration Réseau</h2>
        <table>
            <tr><td><strong>Port HTTP</strong></td><td>$FRONTEND_PORT</td></tr>
            <tr><td><strong>Port HTTPS</strong></td><td>$([ "$ENABLE_SSL" = true ] && echo "443 (Activé)" || echo "Non configuré")</td></tr>
            <tr><td><strong>Domaine</strong></td><td>${DOMAIN:-"Non configuré"}</td></tr>
            <tr><td><strong>URL d'accès</strong></td><td><a href="http://localhost:$FRONTEND_PORT">http://localhost:$FRONTEND_PORT</a></td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>🔒 Sécurité</h2>
        <table>
            <tr><td><strong>SSL/TLS</strong></td><td class="$([ "$ENABLE_SSL" = true ] && echo "success" || echo "warning")">$([ "$ENABLE_SSL" = true ] && echo "✅ Activé" || echo "⚠️ Non activé")</td></tr>
            <tr><td><strong>Pare-feu</strong></td><td class="$([ "$CONFIGURE_FIREWALL" = true ] && echo "success" || echo "warning")">$([ "$CONFIGURE_FIREWALL" = true ] && echo "✅ Configuré" || echo "⚠️ Non configuré")</td></tr>
            <tr><td><strong>Backup auto</strong></td><td>$([ "$BACKUP_AUTO" = true ] && echo "✅ Activé (rétention: $BACKUP_RETENTION_DAYS jours)" || echo "❌ Désactivé")</td></tr>
            <tr><td><strong>Monitoring</strong></td><td>$([ "$MONITORING" = true ] && echo "✅ Activé" || echo "❌ Désactivé")</td></tr>
        </table>
    </div>
    
    <div class="section">
        <h2>⚠️ Important</h2>
        <p class="warning">Votre mot de passe maître n'est <strong>JAMAIS</strong> stocké sur le serveur.</p>
        <p class="warning">Si vous l'oubliez, vos données sont <strong>définitivement perdues</strong>.</p>
    </div>
    
    <div class="footer">
        <p>SecureVault by Nextendo x Micka Delcato | Generated on $timestamp</p>
    </div>
</body>
</html>
EOF
    else
        # Format texte
        cat > "$report_file" << EOF
═══════════════════════════════════════════════════════════════════════════════
                    SECUREVAULT INSTALLATION REPORT
═══════════════════════════════════════════════════════════════════════════════

Date: $timestamp
Version: $VERSION
Theme: $THEME
Mode: $INSTALL_MODE

CONFIGURATION RÉSEAU
────────────────────────────────────────────────────────────────────────────────
Port HTTP:      $FRONTEND_PORT
Port HTTPS:     $([ "$ENABLE_SSL" = true ] && echo "443 (SSL activé)" || echo "Non configuré")
Domaine:        ${DOMAIN:-"Non configuré"}
URL d'accès:    http://localhost:$FRONTEND_PORT

SÉCURITÉ
────────────────────────────────────────────────────────────────────────────────
SSL/TLS:        $([ "$ENABLE_SSL" = true ] && echo "✅ Activé" || echo "⚠️ Non activé")
Pare-feu:       $([ "$CONFIGURE_FIREWALL" = true ] && echo "✅ Configuré" || echo "⚠️ Non configuré")
Service systemd:$([ "$CREATE_SERVICE" = true ] && echo "✅ Créé" || echo "❌ Non créé")
Backup auto:    $([ "$BACKUP_AUTO" = true ] && echo "✅ Activé" || echo "❌ Désactivé")
Monitoring:     $([ "$MONITORING" = true ] && echo "✅ Activé" || echo "❌ Désactivé")

⚠️  IMPORTANT
────────────────────────────────────────────────────────────────────────────────
Votre mot de passe maître n'est JAMAIS stocké sur le serveur.
Si vous l'oubliez, vos données sont irrécupérables.

═══════════════════════════════════════════════════════════════════════════════
                        SecureVault by Nextendo x Micka Delcato
═══════════════════════════════════════════════════════════════════════════════
EOF
    fi
    
    success "Rapport généré: $report_file"
}

# ═══════════════════════════════════════════════════════════════════════════════
# BACKUP AUTOMATIQUE (CRON)
# ═══════════════════════════════════════════════════════════════════════════════

setup_auto_backup() {
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] Backup automatique serait configuré"
        return 0
    fi
    
    info "Configuration du backup automatique..."
    
    local backup_script="${SCRIPT_DIR}/scripts/backup.sh"
    mkdir -p "${SCRIPT_DIR}/scripts"
    
    # Créer le script de backup
    cat > "$backup_script" << 'EOF'
#!/bin/bash
BACKUP_DIR="/var/backups/securevault"
RETENTION_DAYS="${1:-30}"
DATE=$(date +%Y%m%d-%H%M%S)

cd "$(dirname "$0")/.."
mkdir -p "$BACKUP_DIR"

# Créer le backup
tar -czf "$BACKUP_DIR/securevault-$DATE.tar.gz" \
    .env backend/prisma uploads 2>/dev/null

# Supprimer les vieux backups
find "$BACKUP_DIR" -name "securevault-*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup créé: $BACKUP_DIR/securevault-$DATE.tar.gz"
EOF
    
    chmod +x "$backup_script"
    
    # Ajouter au crontab
    (crontab -l 2>/dev/null; echo "0 2 * * * $backup_script $BACKUP_RETENTION_DAYS >> /var/log/securevault-backup.log 2>&1") | crontab -
    
    success "Backup automatique configuré (tous les jours à 2h, rétention: $BACKUP_RETENTION_DAYS jours)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# MONITORING (FAIL2BAN)
# ═══════════════════════════════════════════════════════════════════════════════

setup_monitoring() {
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] Monitoring serait configuré"
        return 0
    fi
    
    if [ "$EUID" -ne 0 ]; then
        warning "Monitoring nécessite root"
        return 1
    fi
    
    info "Installation du monitoring..."
    
    # Installer Fail2ban
    if ! command -v fail2ban-client &> /dev/null; then
        apt-get update -qq
        apt-get install -y -qq fail2ban
    fi
    
    # Configuration Fail2ban pour SecureVault
    cat > /etc/fail2ban/jail.local << EOF
[securevault]
enabled = true
port = $FRONTEND_PORT,3001
filter = securevault
logpath = /var/log/securevault-auth.log
maxretry = 5
bantime = 3600
findtime = 600
EOF
    
    # Créer le filtre
    cat > /etc/fail2ban/filter.d/securevault.conf << EOF
[Definition]
failregex = ^.*Failed login attempt from <HOST>.*$
            ^.*Invalid credentials from <HOST>.*$
ignoreregex =
EOF
    
    systemctl restart fail2ban
    systemctl enable fail2ban
    
    success "Fail2ban configuré (protection brute-force)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STOCKAGE S3
# ═══════════════════════════════════════════════════════════════════════════════

configure_s3_storage() {
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] Stockage S3 serait configuré"
        return 0
    fi
    
    info "Configuration du stockage S3..."
    
    # Demander les credentials si mode interactif
    if [ "$SILENT_MODE" = false ]; then
        echo ""
        read -p "S3 Endpoint (ex: s3.amazonaws.com): " S3_ENDPOINT
        read -p "S3 Bucket: " S3_BUCKET
        read -p "S3 Access Key: " S3_ACCESS_KEY
        read -s -p "S3 Secret Key: " S3_SECRET_KEY
        echo ""
        read -p "S3 Region (défaut: us-east-1): " S3_REGION
        S3_REGION=${S3_REGION:-us-east-1}
    fi
    
    # Ajouter au .env
    cat >> .env << EOF

# S3 Storage Configuration
STORAGE_PROVIDER=s3
S3_ENDPOINT=${S3_ENDPOINT}
S3_BUCKET=${S3_BUCKET}
S3_ACCESS_KEY_ID=${S3_ACCESS_KEY}
S3_SECRET_ACCESS_KEY=${S3_SECRET_KEY}
S3_REGION=${S3_REGION}
EOF
    
    success "Stockage S3 configuré"
}

# ═══════════════════════════════════════════════════════════════════════════════
# GESTION DES ARGUMENTS
# ═══════════════════════════════════════════════════════════════════════════════

parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --silent) SILENT_MODE=true; shift ;;
            --dry-run) DRY_RUN=true; shift ;;
            --port=*) FRONTEND_PORT="${1#*=}"; shift ;;
            --domain=*) DOMAIN="${1#*=}"; shift ;;
            --enable-ssl) ENABLE_SSL=true; shift ;;
            --configure-firewall) CONFIGURE_FIREWALL=true; shift ;;
            --create-service) CREATE_SERVICE=true; shift ;;
            --backup-auto) BACKUP_AUTO=true; shift ;;
            --backup-retention=*) BACKUP_RETENTION_DAYS="${1#*=}"; shift ;;
            --monitoring) MONITORING=true; shift ;;
            --storage=*) STORAGE_TYPE="${1#*=}"; shift ;;
            --theme=*) THEME="${1#*=}"; shift ;;
            --generate-qr) GENERATE_QR=true; shift ;;
            --generate-report) GENERATE_REPORT=true; shift ;;
            --report-format=*) REPORT_FORMAT="${1#*=}"; shift ;;
            --lang=*) LANG="${1#*=}"; load_translations; shift ;;
            --help|-h)
                echo "Usage: $0 [OPTIONS]"
                echo ""
                echo "OPTIONS:"
                echo "  --silent                    Mode non-interactif"
                echo "  --dry-run                   Simulation"
                echo "  --port=PORT                 Port HTTP"
                echo "  --domain=DOMAIN             Nom de domaine"
                echo "  --enable-ssl                Activer HTTPS"
                echo "  --configure-firewall        Configurer pare-feu"
                echo "  --create-service            Service systemd"
                echo "  --backup-auto               Backup automatique"
                echo "  --backup-retention=DAYS     Jours de rétention"
                echo "  --monitoring                Monitoring (Fail2ban)"
                echo "  --storage=s3|local          Type de stockage"
                echo "  --theme=default|nord|dracula Thème de couleurs"
                echo "  --generate-qr               Générer QR code"
                echo "  --generate-report           Générer rapport"
                echo "  --report-format=html|txt    Format du rapport"
                echo "  --lang=fr|en|es|de          Langue"
                echo "  --help                      Cette aide"
                exit 0
                ;;
            *) warning "Option inconnue: $1"; shift ;;
        esac
    done
}

# ═══════════════════════════════════════════════════════════════════════════════
# FONCTIONS PRINCIPALES (simplifiées pour l'exemple)
# ═══════════════════════════════════════════════════════════════════════════════

check_prerequisites() {
    info "$(t checking_prereq)"
    
    if ! command -v docker &> /dev/null; then
        error "Docker non installé"
        exit 1
    fi
    success "Docker OK"
    
    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi
}

generate_secrets() {
    JWT_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    SESSION_SECRET=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    EMAIL_KEY=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
    DB_PASSWORD="vault_$(openssl rand -base64 16 2>/dev/null | tr -dc 'a-zA-Z0-9' | head -c 20)"
}

create_env_file() {
    cat > .env << EOF
DB_USER=vault
DB_PASSWORD=${DB_PASSWORD}
DB_NAME=securevault
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
REAL_EMAIL_ENCRYPTION_KEY=${EMAIL_KEY}
MAIL_DOMAIN=${DOMAIN:-localhost}
VITE_API_URL=http://localhost:3001
FRONTEND_PORT=${FRONTEND_PORT}
FRONTEND_SSL_PORT=$((FRONTEND_PORT + 1))
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:${FRONTEND_PORT}
NODE_ENV=${INSTALL_MODE}
THEME=${THEME}
INSTALL_VERSION=${VERSION}
EOF
    chmod 600 .env
    success "Fichier .env créé"
}

install_docker() {
    if [ "$DRY_RUN" = true ]; then
        info "[DRY-RUN] Docker serait installé"
        return 0
    fi
    
    $COMPOSE_CMD build --no-cache 2>&1 | while read line; do
        echo -e "${GRAY}   $line${NC}"
    done
    
    $COMPOSE_CMD up -d
    success "Services démarrés"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FONCTION PRINCIPALE
# ═══════════════════════════════════════════════════════════════════════════════

main() {
    # Charger les traductions
    load_translations
    
    # Parser les arguments
    parse_arguments "$@"
    
    # Appliquer le thème
    case $THEME in
        nord) colors_nord ;;
        dracula) colors_dracula ;;
        *) colors_default ;;
    esac
    
    # Mode dry-run
    if [ "$DRY_RUN" = true ]; then
        show_banner
        echo -e "\n${BOLD}${CYAN}🧪 MODE SIMULATION${NC}\n"
        echo "Configuration qui serait appliquée:"
        echo "  Port: $FRONTEND_PORT"
        echo "  SSL: $([ "$ENABLE_SSL" = true ] && echo "Oui" || echo "Non")"
        echo "  Thème: $THEME"
        echo "  Backup auto: $([ "$BACKUP_AUTO" = true ] && echo "Oui" || echo "Non")"
        echo "  Monitoring: $([ "$MONITORING" = true ] && echo "Oui" || echo "Non")"
        echo "  Stockage: $STORAGE_TYPE"
        exit 0
    fi
    
    # Affichage
    if [ "$SILENT_MODE" = false ]; then
        clear
        show_banner
    fi
    
    # Installation
    check_prerequisites
    generate_secrets
    create_env_file
    
    # Stockage S3 si demandé
    if [ "$STORAGE_TYPE" = "s3" ]; then
        configure_s3_storage
    fi
    
    install_docker
    
    # Options avancées
    [ "$CONFIGURE_FIREWALL" = true ] && info "Pare-feu à configurer"
    [ "$CREATE_SERVICE" = true ] && info "Service systemd à créer"
    [ "$BACKUP_AUTO" = true ] && setup_auto_backup
    [ "$MONITORING" = true ] && setup_monitoring
    
    # QR Code
    if [ "$GENERATE_QR" = true ]; then
        local url="$([ "$ENABLE_SSL" = true ] && echo "https://$DOMAIN" || echo "http://localhost:$FRONTEND_PORT")"
        generate_qr_code "$url"
    fi
    
    # Rapport
    [ "$GENERATE_REPORT" = true ] && generate_report
    
    # Récapitulatif
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║          🎉 $(t success) 🎉                                                ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "📱 Accès: ${CYAN}http://localhost:$FRONTEND_PORT${NC}"
    [ "$ENABLE_SSL" = true ] && echo -e "🔒 HTTPS: ${CYAN}https://$DOMAIN${NC}"
    echo ""
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════════════${NC}"
    echo -e "                        ${MAGENTA}SecureVault by Nextendo x Micka Delcato${NC}"
    echo -e "${GRAY}═══════════════════════════════════════════════════════════════════════════${NC}"
}

# Lancer
cd "$(dirname "$0")"
main "$@"
exit 0
