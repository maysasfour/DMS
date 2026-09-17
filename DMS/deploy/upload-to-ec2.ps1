# =============================================================
# Upload DMS project to EC2 and trigger deployment
# Run from your Windows PC (PowerShell)
# Usage: .\deploy\upload-to-ec2.ps1
#        .\deploy\upload-to-ec2.ps1 -PemFile "C:\path\to\key.pem"
# =============================================================

param(
    [string]$PemFile  = "C:\Users\HP\Downloads\GP1\DMS\deploy\temp-key.pem",
    [string]$EC2Host  = "ec2-user@dms-maysas.duckdns.org",
    [string]$AppDir   = "/opt/dms"
)

$ErrorActionPreference = "Stop"
$SrcDir  = "C:\Users\HP\Downloads\GP1\DMS"
$TarPath = "$env:TEMP\dms-deploy.tar.gz"
$Domain  = "dms-maysas.duckdns.org"

Write-Host "========================================"
Write-Host " DMS -> AWS EC2 Deployment"
Write-Host " Target: https://$Domain"
Write-Host "========================================"

# Fix .pem permissions (SSH rejects world-readable keys)
icacls $PemFile /inheritance:r /grant:r "${env:USERNAME}:(R)" 2>$null

$SshOpts = @("-i", $PemFile, "-o", "StrictHostKeyChecking=accept-new")

# --- 1: Package project ---
Write-Host "`n[1/5] Creating archive (excluding node_modules, target, dist)..."
if (Test-Path $TarPath) { Remove-Item $TarPath }
tar -czf $TarPath `
    --exclude="./frontend/node_modules" `
    --exclude="./frontend/dist" `
    --exclude="./backend/target" `
    --exclude="./.git" `
    --exclude=".env" `
    --exclude=".env.*" `
    --exclude="*.key" `
    --exclude="*.pem" `
    --exclude="./deploy/*.tar.gz" `
    --exclude="./deploy/*.pem" `
    -C $SrcDir .
$sizeMB = [math]::Round((Get-Item $TarPath).Length / 1MB, 1)
Write-Host "  Archive: $TarPath ($sizeMB MB)"

# --- 2: Upload archive ---
Write-Host "`n[2/5] Uploading archive to EC2..."
scp @SshOpts $TarPath "${EC2Host}:${AppDir}/dms.tar.gz"

# --- 3: Upload production credentials ---
Write-Host "`n[3/5] Uploading .env.production..."
scp @SshOpts "$SrcDir\.env.production" "${EC2Host}:${AppDir}/.env.production"

# --- 4: Extract on server ---
Write-Host "`n[4/5] Extracting on server..."
ssh @SshOpts $EC2Host "cd $AppDir && tar -xzf dms.tar.gz && rm dms.tar.gz && echo 'Extracted OK'"

# --- 5: Build frontend + restart stack ---
Write-Host "`n[5/5] Building frontend and restarting Docker stack..."
$RemoteCmd = @"
set -e
cd $AppDir/frontend
echo '--- Building frontend ---'
npm ci --silent
VITE_GOOGLE_CLIENT_ID=178785973976-u94u71eueui0q0efpqf2am5rcbiburbm.apps.googleusercontent.com \
VITE_FACEBOOK_APP_ID=1675583454618546 \
VITE_AI_AGENT_URL=https://$Domain/ai \
npm run build
echo '--- Frontend built ---'

cd $AppDir
echo '--- Restarting Docker stack ---'
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps
echo '--- Done ---'
"@

ssh @SshOpts $EC2Host $RemoteCmd

Write-Host ""
Write-Host "========================================"
Write-Host " Deployment triggered!"
Write-Host " App:  https://$Domain"
Write-Host " API:  https://$Domain/api/v1"
Write-Host ""
Write-Host " Wait ~90s for backend to start, then open the URL."
Write-Host "========================================"
