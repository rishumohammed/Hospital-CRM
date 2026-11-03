# Production Deployment Guide: Ubuntu Server with Docker

This guide details how to host and run the **Hospital CRM** on an Ubuntu server (20.04, 22.04, or 24.04 LTS) using Docker and Docker Compose.

---

## 1. Architecture Overview

```
                          [ Internet / Users ]
                                   │
                                   ▼
                      [ Nginx Reverse Proxy (Port 80 / 443) ]
                       /                                   \
                      /                                     \
           (Routes: /)                                   (Routes: /api/*, /docs)
                     ▼                                       ▼
        [ Web App Container ]                      [ API Container ]
          Nuxt 3 SPA (Port 3000)                    Fastify + Prisma (Port 4000)
                                                             │
                                                             ▼
                                                    [ MySQL 8.0 Container ]
                                                     Database (Port 3306)
                                                     Volume: mysql_data
```

---

## 2. Server Requirements

- **Operating System:** Ubuntu 20.04, 22.04, or 24.04 LTS
- **Hardware:**
  - Minimum: 1 vCPU, 2 GB RAM (add a 2GB swapfile if on a 1-2GB VPS)
  - Recommended: 2 vCPU, 4 GB RAM
  - Storage: 20 GB SSD
- **Firewall:** Open ports `22` (SSH), `80` (HTTP), and `443` (HTTPS)

> [!TIP]
> If your server has 1 GB or 2 GB of RAM, create a swap file to prevent memory exhaustion during initial Docker builds:
> ```bash
> sudo fallocate -l 2G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

---

## 3. Quick Deployment (1-Command Script)

SSH into your Ubuntu server and follow these steps:

### Step 1: Clone the Repository
```bash
git clone <your-repository-url> /opt/hospital-crm
cd /opt/hospital-crm
```

### Step 2: Run the Deployment Script
```bash
chmod +x deploy.sh
./deploy.sh
```

**What the script does automatically:**
1. Installs Docker and the Docker Compose plugin (if not already installed).
2. Generates a production `.env` with cryptographically secure random passwords for MySQL, JWT access/refresh tokens, and cookies.
3. Builds the optimized `api` and `web` production containers.
4. Initializes and pushes database tables with Prisma.
5. Seeds standard departments, roles, and initial users.
6. Starts Nginx routing traffic to the web and API containers.

---

## 4. Manual Deployment Step-by-Step

If you prefer executing each step manually:

### Step 1: Install Docker & Docker Compose on Ubuntu
```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Enable Docker on boot
sudo systemctl enable docker
sudo systemctl start docker
```

### Step 2: Configure Environment Variables
```bash
cp .env.production.example .env
nano .env
```
Ensure you generate strong, random strings for the security keys:
```bash
# Generate random keys:
openssl rand -hex 16 # for DB passwords
openssl rand -hex 32 # for JWT and Cookie secrets
```

### Step 3: Build & Launch Containers
```bash
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Step 4: Verify Container Status
```bash
sudo docker compose -f docker-compose.prod.yml ps
```
You should see 4 healthy running containers:
- `hospital_crm_mysql` (Up - healthy)
- `hospital_crm_api` (Up)
- `hospital_crm_web` (Up)
- `hospital_crm_nginx` (Up)

---

## 5. Setting up Custom Domain & Free SSL (Let's Encrypt / HTTPS)

### Step 1: Point Your Domain DNS
Add an **A record** in your DNS provider (e.g. Cloudflare, GoDaddy, Namecheap):
- **Host / Name:** `@` (or `crm`)
- **Type:** `A`
- **Value / Target:** Your Ubuntu Server Public IP

### Step 2: Issue SSL Certificate via Certbot
Run Certbot directly using Docker:
```bash
sudo docker run -it --rm --name certbot \
  -v /opt/hospital-crm/nginx/default.conf:/etc/nginx/conf.d/default.conf \
  -v hospital_crm_certbot_conf:/etc/letsencrypt \
  -v hospital_crm_certbot_www:/var/www/certbot \
  certbot/certbot certonly --webroot \
  -w /var/www/certbot \
  -d yourdomain.com -d www.yourdomain.com \
  --email your-email@hospitalcrm.com --agree-tos --no-eff-email
```

### Step 3: Update `nginx/default.conf` for HTTPS
Add the SSL server block into `nginx/default.conf`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    location /api/ {
        proxy_pass http://backend_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    location / {
        proxy_pass http://frontend_web;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

Reload Nginx:
```bash
sudo docker compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

---

## 6. Daily Operations & Maintenance

### View Logs
```bash
# View combined live logs:
sudo docker compose -f docker-compose.prod.yml logs -f

# View API logs only:
sudo docker compose -f docker-compose.prod.yml logs -f api

# View Web logs only:
sudo docker compose -f docker-compose.prod.yml logs -f web
```

### Deploy Updates / New Code
```bash
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Restart Services
```bash
# Restart entire stack:
sudo docker compose -f docker-compose.prod.yml restart

# Restart API only:
sudo docker compose -f docker-compose.prod.yml restart api
```

### Database Backup (MySQL Dump)
```bash
sudo docker compose -f docker-compose.prod.yml exec mysql \
  mysqldump -u root -p$(grep DB_ROOT_PASSWORD .env | cut -d '=' -f2) hospital_crm > backup_$(date +%F).sql
```

