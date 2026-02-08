# SecureVault Installer for Windows
# By nextendo

# Run with: PowerShell -ExecutionPolicy Bypass -File install.ps1

# Check if Docker is installed
try {
    $dockerVersion = docker --version 2>&1
    Write-Host "✅ Docker detected: $dockerVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not installed!" -ForegroundColor Red
    Write-Host "📥 Please install Docker Desktop from: https://www.docker.com/products/docker-desktop"
    exit 1
}

# Check Docker Compose
try {
    $composeVersion = docker compose version 2>&1
    Write-Host "✅ Docker Compose detected" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker Compose not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  SECUREVAULT INSTALLER" -ForegroundColor Cyan
Write-Host "  By nextendo" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Configuration
$port = Read-Host "Enter HTTP Port (default: 8080)"
if ([string]::IsNullOrWhiteSpace($port)) {
    $port = 8080
}

Write-Host ""
Write-Host "🔧 Installing SecureVault on port $port..." -ForegroundColor Yellow

# Generate secrets
$jwtSecret = [Convert]::ToBase64String((Get-Random -Count 32 -Minimum 0 -Maximum 256 | ForEach-Object { [byte]$_ }))
$sessionSecret = [Convert]::ToBase64String((Get-Random -Count 32 -Minimum 0 -Maximum 256 | ForEach-Object { [byte]$_ }))
$emailKey = [Convert]::ToBase64String((Get-Random -Count 32 -Minimum 0 -Maximum 256 | ForEach-Object { [byte]$_ }))
$dbPassword = "vault_$(-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 20 | ForEach-Object { [char]$_ }))"

# Create .env file
$envContent = @"
# SecureVault Configuration
DB_USER=vault
DB_PASSWORD=$dbPassword
DB_NAME=securevault
JWT_SECRET=$jwtSecret
SESSION_SECRET=$sessionSecret
REAL_EMAIL_ENCRYPTION_KEY=$emailKey
MAIL_DOMAIN=localhost
VITE_API_URL=http://localhost:3001
FRONTEND_PORT=$port
FRONTEND_SSL_PORT=$([int]$port + 1)
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:$port
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=524288000
"@

Set-Content -Path ".env" -Value $envContent
Write-Host "✅ Configuration file created (.env)" -ForegroundColor Green

# Build and start
Write-Host ""
Write-Host "🐳 Building Docker containers..." -ForegroundColor Yellow
docker compose build

Write-Host ""
Write-Host "🚀 Starting services..." -ForegroundColor Yellow
docker compose up -d

Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Cyan
Start-Sleep -Seconds 10

# Verify
Write-Host ""
Write-Host "🔍 Verifying installation..." -ForegroundColor Cyan
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -TimeoutSec 5
    Write-Host "✅ API is running! Version: $($response.version)" -ForegroundColor Green
} catch {
    Write-Host "⚠️  API not ready yet, please wait a moment..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ INSTALLATION COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "📱 Access your vault:" -ForegroundColor Cyan
Write-Host "   Web Interface: http://localhost:$port" -ForegroundColor White
Write-Host "   API: http://localhost:3001" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Useful commands:" -ForegroundColor Cyan
Write-Host "   View logs: docker compose logs -f" -ForegroundColor Gray
Write-Host "   Stop: docker compose down" -ForegroundColor Gray
Write-Host "   Restart: docker compose restart" -ForegroundColor Gray
Write-Host ""
Write-Host "⚠️  IMPORTANT: Your master password is NEVER stored on the server!" -ForegroundColor Yellow -BackgroundColor Black
Write-Host "   If you forget it, your data is unrecoverable." -ForegroundColor Red
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Magenta
Write-Host "  SecureVault by Nextendo X Micka Delcato" -ForegroundColor Magenta
Write-Host "═══════════════════════════════════════════════════════════════════════════════" -ForegroundColor Magenta

Pause
