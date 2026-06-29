# Changelog

All notable changes to HELIX are documented in this file.

## [0.3.0] - 2026-06-29

### Added (Phase 3 — Organization & Queue Engine)

- **Departments API**: CRUD with business hours management
- **Skills API**: CRUD with department and user skill assignment
- **Queues API**: CRUD with routing strategies (round-robin, least-busy, skill-based, priority, manual)
- **Priority Engine**: Weighted scoring for VIP, complaint, urgent travel, sentiment, waiting time, WhatsApp expiry, SLA breach
- **Queue Router**: Agent selection service based on queue routing strategy
- **Agent Availability API**: Status updates, break management, supervisor overview
- **Admin UI**: Organization management with departments, skills, queues, and agent availability tabs
- **App Layout**: Sidebar navigation shell for dashboard and admin
- **Seed Data**: Skills, queues per department, business hours, sample agents

## [0.2.0] - 2026-06-29

### Added

- **Authentication**: JWT login, refresh token, logout, and `/auth/me` endpoints
- **RBAC**: Global JWT auth guard, permissions guard, role-based access control
- **Users API**: Full CRUD with pagination, search, soft delete
- **Roles API**: List roles with permissions, grouped permissions endpoint
- **Login UI**: Material Design login page with form validation
- **Dashboard Shell**: Post-login dashboard with user info and logout
- **Auth Frontend**: Auth service, interceptor, route guards (auth + guest)
- **Seed Data**: 5 roles, 46 permissions, 6 departments, admin user, default settings
- **Tests**: Auth service unit tests (login success/failure)

### Default Credentials

- Email: `admin@helix.com`
- Password: `Admin123!`

## [0.1.0] - 2026-06-29

### Added

- **Monorepo**: Nx workspace with `apps/api`, `apps/web`, `apps/web-e2e`, and `packages/{types,shared,utils,ui}`
- **Docker**: Compose stack with PostgreSQL 16, Redis 7, MinIO, API, and Web services
- **Database**: Prisma schema with 30+ models covering auth, organization, conversations, WhatsApp, campaigns, integrations, and audit
- **API Foundation**: NestJS with ConfigModule, PrismaModule, global exception filter, logging/transform interceptors, ValidationPipe, Swagger
- **Health Check**: `/api/health` endpoint with database connectivity check
- **Shared Packages**: TypeScript types, constants, socket events, utility functions
- **Frontend Foundation**: Angular 21 with Material, SCSS design tokens, routing
- **Documentation**: README, Architecture, API, Database, Setup, Deployment, Development Plan
- **Coding Standards**: EditorConfig, ESLint, Prettier configuration

### Technical Notes

- Angular 21 used (latest from Nx 23; spec requested Angular 20)
- Mock adapter pattern documented for WhatsApp, Salesforce, AI, and Booking integrations
- Prisma client generated to `apps/api/src/generated/prisma`
