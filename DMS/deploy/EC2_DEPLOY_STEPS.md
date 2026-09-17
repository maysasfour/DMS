# DMS Deployment — AWS EC2 + DuckDNS + HTTPS

**Domain**: `dms-maysas.duckdns.org`  
**Final URL**: `https://dms-maysas.duckdns.org`  
**EC2 instance**: Amazon Linux 2023, t2.micro (or larger)

---

## Prerequisites checklist

Before starting, confirm all of these:

- [ ] EC2 instance is running (note its **Public IPv4**)
- [ ] EC2 Security Group has inbound rules: **80** (HTTP), **443** (HTTPS), **22** (SSH — your IP only), **5050** (pgAdmin — your IP only)
- [ ] DuckDNS is updated: go to https://www.duckdns.org and set `dms-maysas` → your EC2 public IP
- [ ] Verify DNS: `nslookup dms-maysas.duckdns.org` returns your EC2 IP
- [ ] You have your EC2 `.pem` key file (or use EC2 Instance Connect in the browser)

---

## Part 1 — First-time server setup (run once)

### Open a terminal on EC2

**Option A — EC2 Instance Connect (no key needed):**
1. AWS Console → EC2 → Instances → click your instance
2. Click **Connect** → **EC2 Instance Connect** tab → **Connect**

**Option B — SSH from your PC:**
```powershell
ssh -i C:\Users\HP\Downloads\GP1\DMS\deploy\temp-key.pem ec2-user@dms-maysas.duckdns.org
```

---

### Install Docker, Node.js, Certbot

Paste this entire block into the EC2 terminal:

```bash
sudo dnf update -y

# Docker
sudo dnf install -y docker git curl
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user

# Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Node.js 20 (for building frontend)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Certbot (for Let's Encrypt SSL)
sudo dnf install -y python3 augeas-libs
sudo python3 -m venv /opt/certbot/
sudo /opt/certbot/bin/pip install --upgrade pip certbot
sudo ln -sf /opt/certbot/bin/certbot /usr/bin/certbot

# App directory
sudo mkdir -p /opt/dms
sudo chown ec2-user:ec2-user /opt/dms

echo "=== Setup complete! ==="
```

> **Important**: After this, **disconnect and reconnect** so the `docker` group takes effect.

---

### Get SSL certificate (Let's Encrypt)

After reconnecting, run:

```bash
sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email mays.suhail@gmail.com \
  -d dms-maysas.duckdns.org
```

Expected output ends with:
```
Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/dms-maysas.duckdns.org/fullchain.pem
Key is saved at: /etc/letsencrypt/live/dms-maysas.duckdns.org/privkey.pem
```

Set up auto-renewal:
```bash
echo '0 0,12 * * * root /usr/bin/certbot renew --quiet --deploy-hook "docker compose -f /opt/dms/docker-compose.prod.yml --env-file /opt/dms/.env.production restart frontend"' | sudo tee /etc/cron.d/certbot-renew
```

---

## Part 2 — Upload project files

Run this from **PowerShell on your Windows PC**:

```powershell
$pem = "C:\Users\HP\Downloads\GP1\DMS\deploy\temp-key.pem"
$host = "ec2-user@dms-maysas.duckdns.org"
$src  = "C:\Users\HP\Downloads\GP1\DMS"

# Fix .pem permissions
icacls $pem /inheritance:r /grant:r "${env:USERNAME}:(R)" 2>$null

# Package the project (skip node_modules, build artifacts, git history)
tar -czf "$env:TEMP\dms-deploy.tar.gz" `
  --exclude="./frontend/node_modules" `
  --exclude="./frontend/dist" `
  --exclude="./backend/target" `
  --exclude="./.git" `
  --exclude="./deploy/*.tar.gz" `
  -C $src .

# Upload archive
scp -i $pem -o StrictHostKeyChecking=no "$env:TEMP\dms-deploy.tar.gz" "${host}:/opt/dms/dms.tar.gz"

# Upload production env (credentials — never in git)
scp -i $pem -o StrictHostKeyChecking=no "$src\.env.production" "${host}:/opt/dms/.env.production"

Write-Host "Upload done!"
```

Back on the **EC2 terminal**, extract:

```bash
cd /opt/dms
tar -xzf dms.tar.gz && rm dms.tar.gz
echo "=== Extracted ==="
ls
```

---

## Part 3 — Build and deploy

On the **EC2 terminal**:

### Build the frontend

```bash
cd /opt/dms/frontend
npm ci --silent
VITE_GOOGLE_CLIENT_ID=178785973976-u94u71eueui0q0efpqf2am5rcbiburbm.apps.googleusercontent.com \
VITE_FACEBOOK_APP_ID=1675583454618546 \
VITE_AI_AGENT_URL=https://dms-maysas.duckdns.org/ai \
npm run build
echo "=== Frontend built ==="
cd /opt/dms
```

### Start the Docker stack

```bash
cd /opt/dms
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Watch the startup (Ctrl+C to exit the log view, containers keep running):
```bash
docker compose -f docker-compose.prod.yml logs -f
```

The backend takes ~90 seconds to start on first run (Flyway migration runs).

---

## Part 4 — Verify deployment

```bash
# Backend health
curl -s http://localhost:9090/actuator/health | python3 -m json.tool

# HTTPS frontend
curl -s -o /dev/null -w "Frontend HTTPS: %{http_code}\n" https://dms-maysas.duckdns.org/

# HTTPS API
curl -s -X POST https://dms-maysas.duckdns.org/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dms.com","password":"{{PRIVATE_ACCOUNT_PASSWORD}}"}' | python3 -m json.tool

# AI Agent
curl -s https://dms-maysas.duckdns.org/ai/health
```

---

## Part 5 — Update OAuth settings

### Google Cloud Console

Go to: APIs & Services → Credentials → your OAuth 2.0 Client

Add to **Authorized JavaScript origins**:
```
https://dms-maysas.duckdns.org
```

Add to **Authorized redirect URIs**:
```
https://dms-maysas.duckdns.org
https://dms-maysas.duckdns.org/login
https://dms-maysas.duckdns.org/api/v1/auth/oauth2/callback/google
```

### Meta (Facebook) Developer Console

Go to: Your App → Facebook Login → Settings

Add to **Valid OAuth Redirect URIs**:
```
https://dms-maysas.duckdns.org/api/v1/auth/oauth2/callback/facebook
```

Add to **App Domains**:
```
dms-maysas.duckdns.org
```

---

## Access URLs

| Service | URL |
|---------|-----|
| **DMS Web App** | https://dms-maysas.duckdns.org |
| **API** | https://dms-maysas.duckdns.org/api/v1 |
| **AI Agent** | https://dms-maysas.duckdns.org/ai |
| **pgAdmin** | http://`EC2_PUBLIC_IP`:5050 (close port after use) |

---

## Re-deploying after code changes

From **PowerShell on your Windows PC**, re-upload and redeploy:

```powershell
$pem  = "C:\Users\HP\Downloads\GP1\DMS\deploy\temp-key.pem"
$host = "ec2-user@dms-maysas.duckdns.org"
$src  = "C:\Users\HP\Downloads\GP1\DMS"

tar -czf "$env:TEMP\dms-deploy.tar.gz" `
  --exclude="./frontend/node_modules" --exclude="./frontend/dist" `
  --exclude="./backend/target" --exclude="./.git" `
  -C $src .

scp -i $pem "$env:TEMP\dms-deploy.tar.gz" "${host}:/opt/dms/dms.tar.gz"
scp -i $pem "$src\.env.production" "${host}:/opt/dms/.env.production"

ssh -i $pem $host @'
cd /opt/dms
tar -xzf dms.tar.gz && rm dms.tar.gz
cd frontend
npm ci --silent
VITE_GOOGLE_CLIENT_ID=178785973976-u94u71eueui0q0efpqf2am5rcbiburbm.apps.googleusercontent.com \
VITE_FACEBOOK_APP_ID=1675583454618546 \
VITE_AI_AGENT_URL=https://dms-maysas.duckdns.org/ai \
npm run build
cd /opt/dms
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml ps
'@
```

---

## Troubleshooting

```bash
# Container status
docker compose -f docker-compose.prod.yml ps

# Backend logs (last 50 lines)
docker compose -f docker-compose.prod.yml logs backend --tail=50

# Frontend/nginx logs
docker compose -f docker-compose.prod.yml logs frontend --tail=20

# Restart backend only
docker compose -f docker-compose.prod.yml restart backend

# Full restart
docker compose -f docker-compose.prod.yml down && \
docker compose -f docker-compose.prod.yml up -d

# Check SSL cert
sudo certbot certificates

# Test SSL
curl -vI https://dms-maysas.duckdns.org 2>&1 | grep -E "SSL|issuer|expire"
```

### Common issues

**Backend fails with "password authentication failed"**  
→ Check `DB_PASSWORD` in `.env.production` matches `DB_USERNAME=dms_user`

**Nginx 502 Bad Gateway**  
→ Backend still starting: `docker compose logs backend -f` and wait for "Started DmsApplication"

**SSL cert not found**  
→ Certbot must run before starting the frontend container. Re-run `get-ssl.sh`.

**Frontend shows old data / no API calls**  
→ The nginx config proxies `/api/` to `backend:9090` — check `docker compose ps` to ensure all containers are running.
