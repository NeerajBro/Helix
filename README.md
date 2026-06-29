# HELIX

**Enterprise Customer Support Platform** — WhatsApp-first support with AI bot routing, human agent dashboard, Salesforce integration, and a built-in WhatsApp simulator for demos.

Inspired by Zendesk, Intercom, Freshdesk, Salesforce Service Cloud, and Genesys.

## Features

- WhatsApp customer messaging (simulator + adapter pattern for Meta APIs)
- AI bot with intent-based queue routing (refund, hotel, flight, complaint, general)
- Three-pane agent inbox (Intercom-style)
- Skill-based routing, queue management, SLA tracking
- Salesforce Case sync (mock adapter in development)
- Real-time updates via Socket.IO
- Executive dashboard with ApexCharts
- RBAC with departments, roles, and permissions
- Campaigns, templates, CSAT, audit logs

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Angular 21, Angular Material, Signals, RxJS, ApexCharts, Socket.IO |
| Backend | NestJS, Prisma, PostgreSQL, Redis, BullMQ, Socket.IO, JWT |
| Storage | MinIO (S3-compatible) |
| Monorepo | Nx |
| Testing | Jest, Cypress |
| Infrastructure | Docker Compose |

## Quick Start

### Prerequisites

- Node.js 22+
- Docker & Docker Compose
- npm 10+

### 1. Clone and install

```bash
git clone <repository-url>
cd Helix
npm install --legacy-peer-deps
cp .env.example .env
```

### 2. Start infrastructure

```bash
docker compose up -d postgres redis minio minio-init
```

### 3. Database setup

```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 4. Run development servers

```bash
npm run dev
```

- **Web**: http://localhost:4200
- **API**: http://localhost:3000/api
- **Swagger**: http://localhost:3000/api/docs
- **MinIO Console**: http://localhost:9001

### Docker (full stack)

```bash
docker compose up -d
```

## Project Structure

```
apps/
  api/          NestJS backend
  web/          Angular frontend
  web-e2e/      Cypress E2E tests
packages/
  types/        Shared TypeScript types
  shared/       Constants, socket events
  utils/        Utility functions
  ui/           Shared Angular UI components
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start API + Web in parallel |
| `npm run api:serve` | Start API only |
| `npm run web:serve` | Start Web only |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed development data |
| `npm run test` | Run all unit tests |
| `npm run lint` | Lint all projects |
| `npm run build` | Build all projects |

## Documentation

- [Architecture](./docs/Architecture.md)
- [API Reference](./docs/API.md)
- [Database Schema](./docs/Database.md)
- [Setup Guide](./docs/Setup.md)
- [Deployment](./docs/Deployment.md)
- [Development Plan](./DEVELOPMENT_PLAN.md)
- [Project Progress](./PROJECT_PROGRESS.md)

## License

MIT
