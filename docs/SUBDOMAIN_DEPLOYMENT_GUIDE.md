# UpShift White-Label Subdomain Deployment Guide

This guide explains how to deploy UpShift with working subdomain routing for white-label resellers (e.g., `newco.upshift.works`).

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Architecture Overview](#architecture-overview)
3. [Step 1: Domain & DNS Configuration](#step-1-domain--dns-configuration)
4. [Step 2: SSL Certificate Setup](#step-2-ssl-certificate-setup)
5. [Step 3: Server Setup](#step-3-server-setup)
6. [Step 4: Nginx Configuration](#step-4-nginx-configuration)
7. [Step 5: Application Configuration](#step-5-application-configuration)
8. [Step 6: Docker Deployment](#step-6-docker-deployment)
9. [Step 7: Testing](#step-7-testing)
10. [Troubleshooting](#troubleshooting)
11. [Custom Domain Support](#custom-domain-support)

---

## Prerequisites

- A registered domain (e.g., `upshift.works` or `yourcompany.co.za`)
- A VPS or cloud server (Ubuntu 22.04 recommended)
- Docker and Docker Compose installed
- Basic knowledge of Linux, Nginx, and DNS

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         DNS Provider                             │
│  *.upshift.works  →  YOUR_SERVER_IP                             │
│  upshift.works    →  YOUR_SERVER_IP                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Your Server                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Nginx (Port 80/443)                   │   │
│  │  - SSL Termination (Wildcard Certificate)                │   │
│  │  - Subdomain Detection                                   │   │
│  │  - Proxy to Application                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              │                                   │
│              ┌───────────────┴───────────────┐                  │
│              ▼                               ▼                  │
│  ┌─────────────────────┐       ┌─────────────────────┐         │
│  │  Frontend (React)   │       │  Backend (FastAPI)  │         │
│  │    Port 3000        │       │    Port 8001        │         │
│  └─────────────────────┘       └─────────────────────┘         │
│                                          │                      │
│                                          ▼                      │
│                              ┌─────────────────────┐            │
│                              │  MongoDB            │            │
│                              │    Port 27017       │            │
│                              └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Domain & DNS Configuration

### 1.1 Purchase/Configure Your Domain

Use any domain registrar (Namecheap, GoDaddy, Cloudflare, etc.)

### 1.2 Configure DNS Records

Add these DNS records in your domain provider's dashboard:

| Type | Name | Value | TTL |
|------|------|-------|-----|
| A | @ | YOUR_SERVER_IP | 300 |
| A | * | YOUR_SERVER_IP | 300 |
| A | www | YOUR_SERVER_IP | 300 |

**Example for `upshift.works`:**
```
A    @              →  165.232.123.456
A    *              →  165.232.123.456    (wildcard - catches all subdomains)
A    www            →  165.232.123.456
```

### 1.3 Verify DNS Propagation

Wait 5-30 minutes, then verify:

```bash
# Check main domain
dig upshift.works +short

# Check wildcard subdomain
dig newco.upshift.works +short
dig anyname.upshift.works +short

# All should return your server IP
```

---

## Step 2: SSL Certificate Setup

### Option A: Let's Encrypt Wildcard Certificate (Recommended)

#### Install Certbot

```bash
sudo apt update
sudo apt install certbot python3-certbot-nginx python3-certbot-dns-cloudflare
```

#### For Cloudflare DNS (Recommended for Wildcard)

1. Create Cloudflare API token with DNS edit permissions
2. Create credentials file:

```bash
sudo mkdir -p /etc/letsencrypt
sudo nano /etc/letsencrypt/cloudflare.ini
```

Add:
```ini
dns_cloudflare_api_token = YOUR_CLOUDFLARE_API_TOKEN
```

Set permissions:
```bash
sudo chmod 600 /etc/letsencrypt/cloudflare.ini
```

3. Request wildcard certificate:

```bash
sudo certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  -d upshift.works \
  -d "*.upshift.works" \
  --preferred-challenges dns-01
```

#### For Other DNS Providers

Use DNS challenge manually:

```bash
sudo certbot certonly \
  --manual \
  --preferred-challenges dns \
  -d upshift.works \
  -d "*.upshift.works"
```

Follow the prompts to add TXT records to your DNS.

### Option B: Commercial Wildcard SSL

Purchase from providers like:
- DigiCert
- Sectigo
- GlobalSign

Install the certificate files to `/etc/ssl/`:
```
/etc/ssl/upshift.works/fullchain.pem
/etc/ssl/upshift.works/privkey.pem
```

---

## Step 3: Server Setup

### 3.1 Provision a Server

Recommended specs:
- **Minimum**: 2 CPU, 4GB RAM, 50GB SSD
- **Recommended**: 4 CPU, 8GB RAM, 100GB SSD

Providers: DigitalOcean, Linode, AWS EC2, Google Cloud, Azure, Hetzner

### 3.2 Initial Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl git nginx ufw

# Configure firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installations
docker --version
docker-compose --version
```

---

## Step 4: Nginx Configuration

### 4.1 Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/upshift
```

Add the following configuration:

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name upshift.works *.upshift.works;
    
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }
    
    location / {
        return 301 https://$host$request_uri;
    }
}

# Main HTTPS server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name upshift.works *.upshift.works;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/upshift.works/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/upshift.works/privkey.pem;
    ssl_session_timeout 1d;
    ssl_session_cache shared:SSL:50m;
    ssl_session_tickets off;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS
    add_header Strict-Transport-Security "max-age=63072000" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

    # Proxy headers
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-Host $host;
    
    # IMPORTANT: Pass subdomain info to backend
    proxy_set_header X-Subdomain $subdomain;

    # Extract subdomain
    set $subdomain "";
    if ($host ~* ^([^.]+)\.upshift\.works$) {
        set $subdomain $1;
    }

    # Backend API routes
    location /api/ {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend routes
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }

    # Static files caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 4.2 Enable the Configuration

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/upshift /etc/nginx/sites-enabled/

# Remove default config
sudo rm -f /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## Step 5: Application Configuration

### 5.1 Environment Variables

Create `/app/.env.production`:

```env
# Backend
MONGO_URL=mongodb://mongodb:27017
DB_NAME=upshift_production
JWT_SECRET=your-super-secure-jwt-secret-change-this
CORS_ORIGINS=https://upshift.works,https://*.upshift.works

# Domain Configuration
BASE_DOMAIN=upshift.works
FRONTEND_URL=https://upshift.works
BACKEND_URL=https://upshift.works/api

# Email (SMTP)
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
SMTP_FROM=noreply@upshift.works

# OpenAI (for AI features)
OPENAI_API_KEY=your-openai-key

# Yoco Payments (if applicable)
YOCO_SECRET_KEY=your-yoco-secret-key
YOCO_PUBLIC_KEY=your-yoco-public-key
```

### 5.2 Update Backend for Subdomain Detection

Add this middleware to `/app/backend/server.py`:

```python
from fastapi import Request

@app.middleware("http")
async def subdomain_middleware(request: Request, call_next):
    # Get subdomain from X-Subdomain header (set by Nginx)
    subdomain = request.headers.get("X-Subdomain", "")
    
    # Or extract from host header
    if not subdomain:
        host = request.headers.get("host", "")
        base_domain = os.environ.get("BASE_DOMAIN", "upshift.works")
        if host.endswith(f".{base_domain}"):
            subdomain = host.replace(f".{base_domain}", "").split(".")[0]
    
    # Store in request state for use in routes
    request.state.subdomain = subdomain
    request.state.reseller = None
    
    if subdomain:
        # Look up reseller by subdomain
        reseller = await db.resellers.find_one(
            {"subdomain": subdomain, "status": "active"},
            {"_id": 0}
        )
        request.state.reseller = reseller
    
    response = await call_next(request)
    return response
```

### 5.3 Update Frontend for Subdomain Detection

Update `/app/frontend/src/context/ThemeContext.jsx`:

```javascript
// Add subdomain detection
const getSubdomain = () => {
  const hostname = window.location.hostname;
  const baseDomain = process.env.REACT_APP_BASE_DOMAIN || 'upshift.works';
  
  if (hostname.endsWith(`.${baseDomain}`)) {
    return hostname.replace(`.${baseDomain}`, '').split('.')[0];
  }
  return null;
};

// Use in useEffect to load reseller branding
useEffect(() => {
  const subdomain = getSubdomain();
  if (subdomain) {
    fetchResellerBranding(subdomain);
  }
}, []);
```

---

## Step 6: Docker Deployment

### 6.1 Create Docker Compose File

Create `/app/docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6.0
    container_name: upshift-mongodb
    restart: unless-stopped
    volumes:
      - mongodb_data:/data/db
    networks:
      - upshift-network
    environment:
      MONGO_INITDB_DATABASE: upshift_production

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: upshift-backend
    restart: unless-stopped
    ports:
      - "127.0.0.1:8001:8001"
    environment:
      - MONGO_URL=mongodb://mongodb:27017
      - DB_NAME=upshift_production
      - JWT_SECRET=${JWT_SECRET}
      - BASE_DOMAIN=${BASE_DOMAIN}
    depends_on:
      - mongodb
    networks:
      - upshift-network
    volumes:
      - ./backend:/app
      - backend_uploads:/app/uploads

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        - REACT_APP_BACKEND_URL=https://${BASE_DOMAIN}/api
        - REACT_APP_BASE_DOMAIN=${BASE_DOMAIN}
    container_name: upshift-frontend
    restart: unless-stopped
    ports:
      - "127.0.0.1:3000:3000"
    networks:
      - upshift-network

networks:
  upshift-network:
    driver: bridge

volumes:
  mongodb_data:
  backend_uploads:
```

### 6.2 Create Backend Dockerfile

Create `/app/backend/Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

### 6.3 Create Frontend Dockerfile

Create `/app/frontend/Dockerfile`:

```dockerfile
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build arguments for environment
ARG REACT_APP_BACKEND_URL
ARG REACT_APP_BASE_DOMAIN

ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV REACT_APP_BASE_DOMAIN=$REACT_APP_BASE_DOMAIN

# Build the application
RUN yarn build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Install serve
RUN yarn global add serve

# Copy built files
COPY --from=builder /app/build ./build

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
```

### 6.4 Deploy Commands

```bash
# Clone your repository
git clone https://github.com/yourusername/upshift.git
cd upshift

# Create environment file
cp .env.example .env.production
nano .env.production  # Edit with your values

# Build and start containers
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# Check logs
docker-compose -f docker-compose.prod.yml logs -f

# Check status
docker-compose -f docker-compose.prod.yml ps
```

---

## Step 7: Testing

### 7.1 Test Main Domain

```bash
# Should return your application
curl -I https://upshift.works

# Expected: HTTP/2 200
```

### 7.2 Test Subdomain Routing

```bash
# Test a reseller subdomain
curl -I https://newco.upshift.works

# Expected: HTTP/2 200
```

### 7.3 Test API Subdomain Header

```bash
# Check if subdomain header is passed
curl -v https://newco.upshift.works/api/health

# Look for X-Subdomain in response or logs
```

### 7.4 Browser Testing

1. Visit `https://upshift.works` - Should show main site
2. Visit `https://newco.upshift.works` - Should show NewCo branded site
3. Check browser console for any CORS errors

---

## Troubleshooting

### SSL Certificate Issues

```bash
# Check certificate
sudo certbot certificates

# Renew certificate
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Nginx Issues

```bash
# Test configuration
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check access logs
sudo tail -f /var/log/nginx/access.log
```

### Docker Issues

```bash
# View all logs
docker-compose -f docker-compose.prod.yml logs

# Restart services
docker-compose -f docker-compose.prod.yml restart

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build --force-recreate
```

### DNS Issues

```bash
# Check DNS propagation
dig newco.upshift.works +short

# Check from different DNS servers
dig @8.8.8.8 newco.upshift.works +short
dig @1.1.1.1 newco.upshift.works +short
```

---

## Custom Domain Support

For resellers who want their own domain (e.g., `careers.theircompany.com`):

### 1. Reseller DNS Setup

They need to add a CNAME record:
```
careers.theircompany.com  →  CNAME  →  upshift.works
```

### 2. Update Nginx for Custom Domains

Add custom domain handling:

```nginx
# Custom domain server block
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    # Include all custom domains
    server_name 
        careers.company1.com
        jobs.company2.co.za
        recruitment.company3.com;

    # Use separate certificate or add to existing
    ssl_certificate /etc/letsencrypt/live/upshift.works/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/upshift.works/privkey.pem;

    # Same proxy configuration as main server
    # ...
}
```

### 3. Generate SSL for Custom Domains

```bash
# Add each custom domain to certificate
sudo certbot certonly \
  --nginx \
  -d careers.company1.com \
  -d jobs.company2.co.za
```

### 4. Store Custom Domains in Database

```javascript
// Reseller document
{
  "id": "...",
  "subdomain": "newco",
  "custom_domain": "careers.newco.co.za",
  "custom_domain_verified": true,
  // ...
}
```

---

## Automated SSL with Caddy (Alternative)

If you prefer automatic SSL management, use Caddy instead of Nginx:

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

Create `/etc/caddy/Caddyfile`:

```
*.upshift.works, upshift.works {
    tls {
        dns cloudflare {env.CLOUDFLARE_API_TOKEN}
    }
    
    @api path /api/*
    handle @api {
        reverse_proxy localhost:8001
    }
    
    handle {
        reverse_proxy localhost:3000
    }
}
```

---

## Summary Checklist

- [ ] Domain registered and configured
- [ ] Wildcard DNS records added (`*.yourdomain.com`)
- [ ] DNS propagation complete
- [ ] Server provisioned and secured
- [ ] Docker and Docker Compose installed
- [ ] Wildcard SSL certificate obtained
- [ ] Nginx configured with subdomain extraction
- [ ] Backend middleware for subdomain detection
- [ ] Frontend updated for subdomain detection
- [ ] Docker containers built and running
- [ ] All subdomains tested and working

---

## Support

For additional help:
- Check application logs: `docker-compose logs -f`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Test DNS: `dig subdomain.yourdomain.com`
- Test SSL: `openssl s_client -connect subdomain.yourdomain.com:443`

---

*Document Version: 1.0*
*Last Updated: December 2024*
