#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Hospital CRM - Ubuntu Docker Deployment Script"
echo "  Target Domain: portal.samadselements.com"
echo "=========================================================="

# 1. Verify / Install Docker on Ubuntu
if ! command -v docker &> /dev/null; then
  echo "==> Docker not found. Installing Docker engine and compose..."
  sudo apt-get update
  sudo apt-get install -y ca-certificates curl gnupg lsb-release
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg

  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

  sudo apt-get update
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  sudo systemctl enable docker
  sudo systemctl start docker
  echo "✓ Docker installed successfully!"
fi

# 2. Setup Separate Database Storage Directory on Host
DB_DATA_DIR="/var/lib/hospital-crm-data/mysql"
echo "==> Creating separate database storage directory at $DB_DATA_DIR..."
sudo mkdir -p "$DB_DATA_DIR"
sudo chmod 777 "$DB_DATA_DIR"
echo "✓ Isolated database volume prepared at $DB_DATA_DIR"

# 3. Setup Environment Variables (.env)
if [ ! -f .env ]; then
  echo "==> Creating production .env file with pre-configured credentials..."
  cp .env.production.example .env

  JWT_ACC=$(openssl rand -hex 24)
  JWT_REF=$(openssl rand -hex 24)
  COOKIE_SEC=$(openssl rand -hex 24)

  sed -i "s/change_me_to_a_32_character_random_access_secret/$JWT_ACC/g" .env
  sed -i "s/change_me_to_a_32_character_random_refresh_secret/$JWT_REF/g" .env
  sed -i "s/change_me_to_a_32_character_random_cookie_secret/$COOKIE_SEC/g" .env
  echo "✓ .env configured!"
else
  echo "==> Existing .env file detected."
fi

# 4. Ensure scripts are executable
chmod +x apps/api/docker-entrypoint.sh 2>/dev/null || true
chmod +x setup-ssl.sh 2>/dev/null || true

# 5. Build and Launch Containers
echo "==> Building and starting Docker containers..."
sudo docker compose -f docker-compose.prod.yml down --remove-orphans || true
sudo docker compose -f docker-compose.prod.yml up -d --build

# 6. Show Status
echo ""
echo "=========================================================="
echo "  Deployment Completed Successfully!"
echo "=========================================================="
sudo docker compose -f docker-compose.prod.yml ps

echo ""
echo "Access Points:"
echo "  • Portal (HTTP):     http://portal.samadselements.com/ (or http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')/)"
echo "  • REST API Docs:     http://portal.samadselements.com/docs"
echo "  • API Health:        http://portal.samadselements.com/api/v1/health"
echo "  • Database Storage:  $DB_DATA_DIR (Persisted independently)"
echo ""
echo "To enable Free SSL (HTTPS), run:"
echo "  ./setup-ssl.sh portal.samadselements.com admin@samadselements.com"
echo ""
echo "To view live logs:"
echo "  sudo docker compose -f docker-compose.prod.yml logs -f"
