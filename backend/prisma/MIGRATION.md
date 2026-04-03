# Database Migration & Seeding Guide

## Prerequisites

- MySQL 8.0+ running and accessible
- `DATABASE_URL` configured in `backend/.env`
- Prisma CLI installed: `cd backend && npm install`

## Initial Setup

### 1. Create Database

```sql
CREATE DATABASE pilates_studio
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2. Generate Prisma Client

```bash
cd backend
npx prisma generate
```

### 3. Run First Migration

```bash
npx prisma migrate dev --name init
```

This will:
- Create the `pilates_studio` schema if not exists
- Apply all model definitions from `schema.prisma`
- Track migration history in `prisma/migrations/`

## Development Workflow

### Modify Schema

1. Edit `prisma/schema.prisma`
2. Run development migration:

```bash
npx prisma migrate dev --name <descriptive_name>
```

Examples:
```bash
npx prisma migrate dev --name add_member_avatar
npx prisma migrate dev --name update_booking_status
```

### View Database

```bash
npx prisma studio
# Opens http://localhost:5555
```

### Reset Database (WARNING: DESTROYS DATA)

```bash
npx prisma migrate reset
```

## Production Workflow

### Deploy Migrations

```bash
# Docker Compose
docker-compose exec backend npx prisma migrate deploy

# Manual
cd backend
npx prisma migrate deploy
```

### Verify Migration Status

```bash
npx prisma migrate status
```

## Seeding

### Run Seed

```bash
# Docker Compose
docker-compose exec backend npx prisma db seed

# Manual
cd backend
npx prisma db seed
```

### Seed Behavior

The seed script (`prisma/seed.ts`) creates:
- Default roles: OWNER, FRONTDESK, COACH, FINANCE
- Default permissions mapped to roles
- Initial admin user from `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` env vars
- Sample membership plans, coaches, courses, and members (optional)

### Re-seed After Reset

```bash
npx prisma migrate reset --force
# Automatically runs seed after reset
```

## Troubleshooting

### Migration Lock Error

```bash
# Remove failed migration lock
npx prisma migrate resolve --rolled-back <migration_name>
# Or mark as applied
npx prisma migrate resolve --applied <migration_name>
```

### Drift Detected

```bash
# If manual schema changes were made outside Prisma
npx prisma db pull   # Pull current schema from DB
npx prisma migrate dev --name fix_drift
```

### Connection Failed

- Check `DATABASE_URL` format: `mysql://USER:PASS@HOST:PORT/DB`
- Verify MySQL is running and network accessible
- Ensure user has sufficient privileges

## Backup and Restore

### Backup

```bash
# Using Docker
docker-compose exec mysql mysqldump -u root -p pilates_studio > backup_$(date +%Y%m%d_%H%M%S).sql

# Direct
mysqldump -h localhost -u root -p pilates_studio > backup.sql
```

### Restore

```bash
# Using Docker
docker-compose exec -T mysql mysql -u root -p pilates_studio < backup.sql

# Direct
mysql -h localhost -u root -p pilates_studio < backup.sql
```

## Schema Versioning

Always commit these files to version control:
- `prisma/schema.prisma`
- `prisma/migrations/*/migration.sql`
- `prisma/migrations/migration_lock.toml`

Never commit:
- `.env`
- Database dumps (*.sql) unless specifically needed
