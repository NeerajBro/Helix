# HELIX Setup Guide

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| Node.js | 22+ | `node --version` |
| npm | 10+ | `npm --version` |
| Docker | 24+ | `docker --version` |
| Docker Compose | 2+ | `docker compose version` |
| Git | 2+ | `git --version` |

## Installation

### 1. Clone repository

```bash
git clone <repository-url>
cd Helix
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Environment configuration

```bash
cp .env.example .env
```

Edit `.env` if you need custom ports or credentials.

### 4. Start infrastructure services

```bash
docker compose up -d postgres redis minio minio-init
```

Verify services are healthy:

```bash
docker compose ps
```

### 5. Database setup

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed data (available after Phase 4)
npm run db:seed
```

### 6. Start development servers

```bash
# Start both API and Web
npm run dev

# Or individually
npm run api:serve   # http://localhost:3000
npm run web:serve   # http://localhost:4200
```

## Verification

| Service | URL | Expected |
|---------|-----|----------|
| API Health | http://localhost:3000/api/health | `{ "status": "ok" }` |
| Swagger | http://localhost:3000/api/docs | Swagger UI |
| Web App | http://localhost:4200 | HELIX landing page |
| MinIO Console | http://localhost:9001 | Login with `helix_minio` / `helix_minio_secret` |
| PostgreSQL | localhost:5432 | DB `helix`, user `helix` |
| Redis | localhost:6379 | PING → PONG |

## IDE Setup

### VS Code / Cursor Extensions

- ESLint
- Prettier
- Prisma
- Angular Language Service
- Nx Console

### Recommended Settings

The workspace includes `.editorconfig` and `.prettierrc` for consistent formatting.

## Troubleshooting

### Port conflicts

If ports 3000, 4200, 5432, 6379, or 9000 are in use, either stop conflicting services or update ports in `.env` and `docker-compose.yml`.

### Prisma client not found

```bash
npm run db:generate
```

### Database connection refused

Ensure PostgreSQL container is running and healthy:

```bash
docker compose up -d postgres
docker compose logs postgres
```

### npm peer dependency errors

Use the legacy peer deps flag:

```bash
npm install --legacy-peer-deps
```

## Running Tests

```bash
# All unit tests
npm run test

# API tests only
npx nx test api

# Web tests only
npx nx test web

# E2E tests (requires running app)
npx nx e2e web-e2e
```

## Building for Production

```bash
npm run build
```

Or with Docker:

```bash
docker compose up -d --build
```
