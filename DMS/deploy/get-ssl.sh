#!/bin/bash
# =============================================================
# Get SSL Certificate from Let's Encrypt via DuckDNS
# Run ONCE after setup-server.sh, before deploy-app.sh
# Requires port 80 to be open on EC2 and DuckDNS pointing
# to this EC2's public IP.
# =============================================================

DOMAIN="dms-maysas.duckdns.org"
EMAIL="mays.suhail@gmail.com"

echo "Getting SSL certificate for $DOMAIN ..."

# Standalone mode — temporarily binds port 80
sudo certbot certonly \
  --standalone \
  --non-interactive \
  --agree-tos \
  --email "$EMAIL" \
  -d "$DOMAIN"

echo ""
echo "Certificate obtained!"
echo "Cert:    /etc/letsencrypt/live/$DOMAIN/fullchain.pem"
echo "Key:     /etc/letsencrypt/live/$DOMAIN/privkey.pem"
echo ""
echo "Set up auto-renewal:"
echo "  echo '0 0,12 * * * root /usr/bin/certbot renew --quiet --deploy-hook \"docker compose -f /opt/dms/docker-compose.prod.yml restart frontend\"' | sudo tee /etc/cron.d/certbot-renew"
