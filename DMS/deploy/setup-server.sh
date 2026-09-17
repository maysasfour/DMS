#!/bin/bash
# =============================================================
# DMS Server Setup Script — Amazon Linux 2023
# EC2: dms-maysas.duckdns.org
# Run ONCE on a fresh EC2 instance via EC2 Instance Connect
# =============================================================

set -e

echo "======================================"
echo " DMS Server Setup — Amazon Linux 2023"
echo "======================================"

# 1. Update system
sudo dnf update -y

# 2. Install Docker
sudo dnf install -y docker git curl
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# 3. Install Docker Compose plugin
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version

# 4. Install Node.js 20 (to build frontend on server)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 5. Install Certbot (Let's Encrypt SSL)
sudo dnf install -y python3 augeas-libs
sudo python3 -m venv /opt/certbot/
sudo /opt/certbot/bin/pip install --upgrade pip
sudo /opt/certbot/bin/pip install certbot
sudo ln -sf /opt/certbot/bin/certbot /usr/bin/certbot

# 6. Create app directory
sudo mkdir -p /opt/dms
sudo chown ec2-user:ec2-user /opt/dms

echo ""
echo "======================================"
echo " Setup complete!"
echo " Next: upload files, then run get-ssl.sh"
echo " then run deploy-app.sh"
echo "======================================"
