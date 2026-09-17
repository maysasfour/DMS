#!/bin/bash
# =============================================================
# DMS Production Deployment Script
# Domain: dms-maysas.duckdns.org  (DuckDNS → AWS EC2)
# Run from /opt/dms on the EC2 instance
# =============================================================

set -e

APP_DIR="/opt/dms"
DOMAIN="dms-maysas.duckdns.org"

echo "========================================"
echo " Deploying DMS to https://$DOMAIN"
echo "========================================"

cd $APP_DIR

# --- Build frontend on server (avoids OOM on t2.micro) ---
echo "[1/5] Building frontend..."
cd frontend
npm ci --silent
VITE_GOOGLE_CLIENT_ID=178785973976-u94u71eueui0q0efpqf2am5rcbiburbm.apps.googleusercontent.com \
VITE_FACEBOOK_APP_ID=1675583454618546 \
VITE_AI_AGENT_URL=https://$DOMAIN/ai \
npm run build
cd ..

# --- Bring up Docker stack ---
echo "[2/5] Starting Docker stack..."
docker compose -f docker-compose.prod.yml --env-file .env.production down --remove-orphans 2>/dev/null || true
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# --- Wait for backend health ---
echo "[3/5] Waiting for backend to become healthy (up to 3 min)..."
for i in $(seq 1 36); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9090/actuator/health 2>/dev/null || echo "000")
  if [ "$STATUS" = "200" ]; then
    echo "  ✓ Backend healthy"
    break
  fi
  echo "  ... attempt $i/36 (HTTP $STATUS)"
  sleep 5
done

# --- Health checks ---
echo "[4/5] Running health checks..."

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/api/v1/actuator/health 2>/dev/null || echo "000")
[ "$HTTP_CODE" = "200" ] && echo "  ✓ API (HTTPS): OK" || echo "  ✗ API: HTTP $HTTP_CODE"

FRONT_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/ 2>/dev/null || echo "000")
[ "$FRONT_CODE" = "200" ] && echo "  ✓ Frontend (HTTPS): OK" || echo "  ✗ Frontend: HTTP $FRONT_CODE"

AI_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN/ai/health 2>/dev/null || echo "000")
[ "$AI_CODE" = "200" ] && echo "  ✓ AI Agent (HTTPS): OK" || echo "  ✗ AI Agent: HTTP $AI_CODE"

echo ""
echo "[5/5] Deployment complete!"
echo "========================================"
echo "  App:       https://$DOMAIN"
echo "  API:       https://$DOMAIN/api/v1"
echo "  AI Agent:  https://$DOMAIN/ai"
echo "  pgAdmin:   http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):5050"
echo "========================================"
