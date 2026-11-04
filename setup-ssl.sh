#!/usr/bin/env bash
set -e

DOMAIN="portal.samadselements.com"
EMAIL=${1:-"admin@samadselements.com"}

echo "=========================================================="
echo "  Setting up Let's Encrypt SSL for $DOMAIN"
echo "=========================================================="

echo "==> Step 1: Requesting SSL certificate from Let's Encrypt..."
sudo docker run --rm --name certbot \
  --volumes-from hospital_crm_nginx \
  certbot/certbot certonly --webroot \
  --non-interactive \
  -w /var/www/certbot \
  -d $DOMAIN \
  --email $EMAIL --agree-tos --no-eff-email

echo "==> Step 2: Activating HTTPS in Nginx configuration..."
cat << 'EOF' | sudo tee ./nginx/default.conf > /dev/null
upstream backend_api {
    server api:4000;
    keepalive 32;
}

upstream frontend_web {
    server web:3000;
    keepalive 32;
}

# HTTP: Redirect all traffic to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name portal.samadselements.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS: Secure portal server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name portal.samadselements.com;

    ssl_certificate /etc/letsencrypt/live/portal.samadselements.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/portal.samadselements.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    client_max_body_size 50M;

    # REST API & WebSocket proxy
    location /api/ {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # API Documentation / Swagger
    location /docs {
        proxy_pass http://backend_api;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
    }

    # Web Frontend (Nuxt 3 SPA)
    location / {
        proxy_pass http://frontend_web;
        proxy_http_version 1.1;

        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Static assets cache control
        location ~* \.(?:ico|css|js|gif|jpe?g|png|woff2?|eot|ttf|svg|webp)$ {
            proxy_pass http://frontend_web;
            proxy_set_header Host $host;
            expires 7d;
            add_header Cache-Control "public, max-age=604800, immutable";
        }
    }
}
EOF

echo "==> Step 3: Reloading Nginx with SSL..."
sudo docker compose -f docker-compose.prod.yml restart nginx

echo ""
echo "=========================================================="
echo "  ✓ HTTPS active at: https://portal.samadselements.com"
echo "=========================================================="

