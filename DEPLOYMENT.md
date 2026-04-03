# Pilates Studio - Production Deployment Guide

## System Requirements

- **OS**: Linux (Ubuntu 22.04 LTS recommended) or Docker-capable environment
- **Node.js**: 20.x (for manual deployment)
- **Database**: MySQL 8.0+
- **Memory**: Minimum 2GB RAM (4GB recommended)
- **Storage**: 20GB+ free space

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Admin Frontend │────▶│   Nginx Proxy   │────▶│  NestJS Backend │
│   (Umi/AntD)    │     │   (Port 80)     │     │   (Port 3000)   │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                          │
┌─────────────────┐                                     │
│   Mini Program  │─────────────────────────────────────│
│   (WeChat/Taro) │     HTTPS API Calls                 │
└─────────────────┘                                     ▼
                                               ┌─────────────────┐
                                               │  MySQL 8.0+     │
                                               │  (Port 3306)    │
                                               └─────────────────┘
```

## Quick Start (Docker Compose)

### 1. Environment Setup

```bash
# Clone repository
cd /opt/pilates-studio-admin

# Copy and configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with production values:
# - JWT_ACCESS_SECRET: Generate with `openssl rand -base64 32`
# - JWT_REFRESH_SECRET: Generate with `openssl rand -base64 32`
# - MYSQL_ROOT_PASSWORD: Strong password
# - MYSQL_PASSWORD: Strong password
# - CORS_ORIGINS: Your domain(s)

# Create .env for docker-compose
cat > .env << EOF
MYSQL_ROOT_PASSWORD=your_secure_root_password
MYSQL_PASSWORD=your_secure_app_password
JWT_ACCESS_SECRET=$(openssl rand -base64 32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32)
CORS_ORIGINS=https://admin.yourdomain.com
EOF
```

### 2. Build and Deploy

```bash
# Build admin frontend
cd /opt/pilates-studio-admin
npm install
npm run build

# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend npx prisma migrate deploy

# Seed initial data (optional)
docker-compose exec backend npx prisma db seed
```

### 3. Verify Deployment

```bash
# Check all services are running
docker-compose ps

# Check logs
docker-compose logs -f backend

# Test health endpoint
curl http://localhost:3000/api/health

# Access admin panel
open http://localhost
```

## Manual Deployment (Non-Docker)

### 1. Database Setup

```bash
# Install MySQL 8.0
sudo apt update
sudo apt install mysql-server-8.0

# Create database and user
sudo mysql -e "CREATE DATABASE pilates_studio CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'pilates'@'localhost' IDENTIFIED BY 'strong_password';"
sudo mysql -e "GRANT ALL PRIVILEGES ON pilates_studio.* TO 'pilates'@'localhost';"
sudo mysql -e "FLUSH PRIVILEGES;"
```

### 2. Backend Deployment

```bash
cd /opt/pilates-studio-admin/backend

# Install dependencies
npm ci --production

# Set up environment
cp .env.example .env
# Edit .env with production values

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Start with PM2
npm install -g pm2
pm2 start dist/main.js --name pilates-backend
pm2 save
pm2 startup
```

### 3. Admin Frontend Deployment

```bash
cd /opt/pilates-studio-admin

# Install dependencies
npm install

# Build for production
npm run build

# Serve with Nginx
sudo cp -r dist/* /var/www/pilates-admin/
sudo cp nginx.conf /etc/nginx/sites-available/pilates-admin
sudo ln -s /etc/nginx/sites-available/pilates-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Database Management

### Migrations

```bash
# View migration status
npx prisma migrate status

# Deploy pending migrations
npx prisma migrate deploy

# Create new migration (development only)
npx prisma migrate dev --name descriptive_name

# Reset database (WARNING: destroys all data)
npx prisma migrate reset
```

### Backup and Restore

```bash
# Backup
docker-compose exec mysql mysqldump -u root -p pilates_studio > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore
docker-compose exec -T mysql mysql -u root -p pilates_studio < backup_file.sql
```

### Prisma Studio (Database GUI)

```bash
docker-compose exec backend npx prisma studio --port 5555 --hostname 0.0.0.0
# Access at http://localhost:5555
```

## Monitoring and Logs

### View Logs

```bash
# Backend logs
docker-compose logs -f backend

# MySQL logs
docker-compose logs -f mysql

# All logs
docker-compose logs -f
```

### Health Checks

```bash
# API health
curl http://localhost:3000/api/health

# Database connection
curl http://localhost:3000/api/health/db
```

## SSL/HTTPS Setup (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d admin.yourdomain.com -d api.yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Troubleshooting

### Database Connection Failed

- Verify MySQL is running: `docker-compose ps mysql`
- Check credentials in `.env`
- Ensure database exists: `docker-compose exec mysql mysql -u root -p -e "SHOW DATABASES;"`

### Migration Failures

```bash
# Reset and re-run
docker-compose exec backend npx prisma migrate reset --force
docker-compose exec backend npx prisma migrate deploy
```

### 502 Bad Gateway

- Check backend is healthy: `curl http://localhost:3000/api/health`
- Verify Nginx config: `sudo nginx -t`
- Check logs: `docker-compose logs backend`

## Security Checklist

- [ ] Strong JWT secrets (min 32 characters)
- [ ] MySQL root password changed from default
- [ ] Database user has limited privileges
- [ ] CORS origins restricted to known domains
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Rate limiting enabled
- [ ] Container running as non-root user
- [ ] Environment files not committed to git
- [ ] Sensitive data not logged
- [ ] Regular security updates applied

## Update Procedure

```bash
# 1. Backup database
docker-compose exec mysql mysqldump -u root -p pilates_studio > backup_pre_update.sql

# 2. Pull latest code
git pull origin main

# 3. Rebuild and restart
docker-compose down
docker-compose up --build -d

# 4. Run migrations
docker-compose exec backend npx prisma migrate deploy

# 5. Verify
curl http://localhost:3000/api/health
```

## Support

For deployment issues, check:
1. Application logs: `docker-compose logs -f backend`
2. System resources: `docker stats`
3. Database status: `docker-compose exec mysql mysql -u root -p -e "SHOW PROCESSLIST;"`
