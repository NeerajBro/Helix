# HELIX Deployment Guide

## Docker Compose (Recommended)

Full stack deployment with a single command:

```bash
docker compose up -d --build
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| postgres | 5432 | PostgreSQL database |
| redis | 6379 | Cache and job queue |
| minio | 9000, 9001 | Object storage |
| api | 3000 | NestJS API |
| web | 4200 | Angular frontend |

### Production Environment Variables

Create a `.env` file with production values:

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@postgres:5432/helix
REDIS_URL=redis://redis:6379
JWT_SECRET=<strong-random-secret>
JWT_REFRESH_SECRET=<strong-random-secret>
CORS_ORIGIN=https://your-domain.com
MINIO_ENDPOINT=minio
MINIO_ACCESS_KEY=<production-key>
MINIO_SECRET_KEY=<production-secret>
```

**Important**: Never use development secrets in production.

## Database Migrations

Run migrations before starting the API:

```bash
docker compose run --rm api npx prisma migrate deploy --schema=prisma/schema.prisma
```

## Health Checks

| Endpoint | Expected |
|----------|----------|
| `GET /api/health` | HTTP 200, `status: "ok"` |
| PostgreSQL | `pg_isready` passes |
| Redis | `redis-cli ping` → PONG |
| MinIO | `/minio/health/live` → 200 |

## Scaling Considerations

### API

- Run multiple API instances behind a load balancer
- Socket.IO requires sticky sessions or Redis adapter for multi-instance
- Configure `REDIS_URL` for BullMQ job processing

### Database

- Use managed PostgreSQL (AWS RDS, Azure Database, etc.) for production
- Enable connection pooling (PgBouncer recommended)
- Regular backups with point-in-time recovery

### Storage

- Replace MinIO with AWS S3, Azure Blob, or GCS in production
- Configure CDN for attachment delivery

### Redis

- Use managed Redis (ElastiCache, Azure Cache) for production
- Required for BullMQ campaigns and Socket.IO adapter

## SSL/TLS

Place a reverse proxy (nginx, Traefik, Caddy) in front of the stack:

```nginx
server {
    listen 443 ssl;
    server_name helix.example.com;

    ssl_certificate /etc/ssl/certs/helix.crt;
    ssl_certificate_key /etc/ssl/private/helix.key;

    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location / {
        proxy_pass http://web:4200;
    }
}
```

## Monitoring

Recommended observability stack:

- **Logs**: Structured JSON logging (Winston/Pino)
- **Metrics**: Prometheus + Grafana
- **Tracing**: OpenTelemetry
- **Uptime**: Health check endpoint monitoring
- **Alerts**: SLA breach notifications via Socket.IO + email

## Backup Strategy

| Component | Method | Frequency |
|-----------|--------|-----------|
| PostgreSQL | pg_dump / managed backups | Daily |
| MinIO/S3 | Cross-region replication | Continuous |
| Redis | RDB snapshots | Hourly |
| Configuration | Git + secrets manager | On change |

## Integration Swap (Production)

Replace mock adapters with real implementations:

1. **WhatsApp**: Implement `WhatsAppAdapter` with Meta Cloud API
2. **Salesforce**: Implement `SalesforceAdapter` with REST API + OAuth
3. **AI Bot**: Implement `AiBotAdapter` with OpenAI/Anthropic API
4. **Bookings**: Implement `BookingAdapter` with your booking system API

No business logic changes required — only adapter implementations.
