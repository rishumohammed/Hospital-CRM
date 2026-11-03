# Production Deployment Guide: Ubuntu Server with Docker
**Domain:** `portal.samadselements.com`  
**Git Repository:** `https://github.com/rishumohammed/Hospital-CRM.git`

---

## 1. Architecture Overview

```
                                [ Users / Internet ]
                                         │
                                         ▼
                     [ Nginx Reverse Proxy (Ports 80 & 443) ]
                     Server Name: portal.samadselements.com
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
                                                     Host Volume: /var/lib/hospital-crm-data/mysql
```

---

## 2. Server Requirements & Prerequisites

- **Operating System:** Ubuntu 20.04, 22.04, or 24.04 LTS
- **Hardware:**
  - Recommended: 2 vCPU, 4 GB RAM (or 2 GB RAM + 2 GB swapfile)
  - Storage: 20 GB SSD
- **Firewall:** Open ports `22` (SSH), `80` (HTTP), and `443` (HTTPS)
- **DNS Record:** Ensure an **A Record** for `portal.samadselements.com` points to your Ubuntu server's public IP address.

---

## 3. Quick Deployment (Recommended)

SSH into your Ubuntu server and execute:

```bash
# 1. Clone your repository
git clone https://github.com/rishumohammed/Hospital-CRM.git /opt/hospital-crm
cd /opt/hospital-crm

# 2. Make scripts executable
chmod +x deploy.sh setup-ssl.sh

# 3. Run the automated deployment script
./deploy.sh
```

**What `deploy.sh` handles automatically:**
1. Installs Docker and the Docker Compose plugin (if not already installed).
2. Creates the isolated database storage on the host at `/var/lib/hospital-crm-data/mysql`.
3. Prepares `.env` with your database password (`5@mads3LewenT%%`) and generates cryptographically secure JWT/session keys.
4. Builds the containerized API and Nuxt 3 web frontend.
5. Pushes Prisma database tables and seeds hospital departments, roles, and default users.
6. Starts Nginx routing traffic to the portal.

---

## 4. Enabling Free SSL / HTTPS (Let's Encrypt)

Once `deploy.sh` finishes and your domain `portal.samadselements.com` is pointing to the server IP:

```bash
# Run the 1-step SSL setup:
./setup-ssl.sh portal.samadselements.com admin@samadselements.com
```

This will automatically:
1. Request a valid SSL certificate from Let's Encrypt via Certbot.
2. Configure Nginx with TLSv1.2 & TLSv1.3 and automatic HTTP-to-HTTPS redirection.
3. Reload Nginx without downtime.

Your portal is now securely accessible at:  
👉 **`https://portal.samadselements.com`**

---

## 5. Dedicated Database Storage & Backups

The MySQL data is intentionally **separated from the Docker container lifecycle** and stored directly on your host filesystem:
- **Host Location:** `/var/lib/hospital-crm-data/mysql`
- **Database User:** `crm_user`
- **Database Name:** `hospital_crm`
- **Database Password:** `5@mads3LewenT%%`

Because this volume lives outside the Docker container directory, running `docker compose down -v` or updating containers will **never delete or overwrite your patient data**.

### Manual Database Backup (mysqldump)
To take a backup anytime:
```bash
sudo docker compose -f docker-compose.prod.yml exec mysql \
  mysqldump -u crm_user -p"5@mads3LewenT%%" hospital_crm > backup_$(date +%F_%H%M%S).sql
```

---

## 6. Daily Operations & Commands

### View Live Logs
```bash
# All containers:
sudo docker compose -f docker-compose.prod.yml logs -f

# API container only:
sudo docker compose -f docker-compose.prod.yml logs -f api

# Web container only:
sudo docker compose -f docker-compose.prod.yml logs -f web
```

### Pull Updates & Redeploy
When you push code changes to GitHub:
```bash
cd /opt/hospital-crm
git pull
sudo docker compose -f docker-compose.prod.yml up -d --build
```

### Restart Services
```bash
sudo docker compose -f docker-compose.prod.yml restart
```
