#!/usr/bin/env bash
set -e

echo "=========================================================="
echo "  Hospital CRM - Ubuntu Docker Deployment Script"
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

# 2. Setup Environment Variables
if [ ! -f .env ]; then
  echo "==> Creating production .env file with randomized secure secrets..."
  cp .env.production.example .env

  ROOT_PW=$(openssl rand -hex 16)
  CRM_PW=$(openssl rand -hex 16)
  JWT_ACC=$(openssl rand -hex 24)
  JWT_REF=$(openssl rand -hex 24)
  COOKIE_SEC=$(openssl rand -hex 24)

  sed -i "s/change_this_root_password_12345/$ROOT_PW/g" .env
  sed -i "s/change_this_user_password_12345/$CRM_PW/g" .env
  sed -i "s/change_me_to_a_32_character_random_access_secret/$JWT_ACC/g" .env
  sed -i "s/change_me_to_a_32_character_random_refresh_secret/$JWT_REF/g" .env
  sed -i "s/change_me_to_a_32_character_random_cookie_secret/$COOKIE_SEC/g" .env
  echo "✓ .env configured with unique cryptographic secrets!"
else
  echo "==> Existing .env file detected."
fi

# 3. Ensure proper permissions
chmod +x apps/api/docker-entrypoint.sh 2>/dev/null || true

# 4. Build and Launch Containers
echo "==> Building and starting Docker containers..."
sudo docker compose -f docker-compose.prod.yml down --remove-orphans || true
sudo docker compose -f docker-compose.prod.yml up -d --build

# 5. Show Status
echo ""
echo "=========================================================="
echo "  Deployment Completed Successfully!"
echo "=========================================================="
sudo docker compose -f docker-compose.prod.yml ps

echo ""
echo "Access Points:"
echo "  • Web Application: http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')/"
echo "  • REST API Docs:   http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')/docs"
echo "  • API Health:      http://$(curl -s ifconfig.me || echo 'YOUR_SERVER_IP')/api/v1/health"
echo ""
echo "To view live logs: sudo docker compose -f docker-compose.prod.yml logs -f"

