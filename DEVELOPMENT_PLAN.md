# HELIX Development Plan

Enterprise-grade phased delivery plan. Each phase is fully completed before moving to the next.

---

## Phase 1: Foundation & Infrastructure ✅

**Goal**: Monorepo, Docker, database schema, coding standards, documentation.

| Deliverable | Status |
|-------------|--------|
| Nx monorepo (apps/web, apps/api, packages/*) | ✅ |
| Docker Compose (PostgreSQL, Redis, MinIO, API, Web) | ✅ |
| Prisma schema (all entities, indexes, soft deletes) | ✅ |
| NestJS foundation (filters, interceptors, config, health) | ✅ |
| Angular foundation (Material, SCSS tokens) | ✅ |
| Shared packages (types, shared, utils, ui) | ✅ |
| Documentation (README, Architecture, API, Database, Setup, Deployment) | ✅ |
| Coding standards (.editorconfig, ESLint, Prettier) | ✅ |

---

## Phase 2: Authentication & RBAC

**Goal**: JWT auth, refresh tokens, roles, permissions, user management.

| Deliverable | Status |
|-------------|--------|
| Auth module (login, refresh, logout) | ⬜ |
| JWT guards and decorators | ⬜ |
| RBAC permission guard | ⬜ |
| Users CRUD API | ⬜ |
| Roles & Permissions API | ⬜ |
| Login UI + auth guard + interceptor | ⬜ |
| Seed: roles, permissions, admin user | ⬜ |

---

## Phase 3: Organization & Queue Engine ✅

**Goal**: Departments, skills, queues, business hours, agent availability.

| Deliverable | Status |
|-------------|--------|
| Departments module | ✅ |
| Skills module | ✅ |
| Queues module with routing strategies | ✅ |
| Business hours configuration | ✅ |
| Agent availability & break management | ✅ |
| Priority calculation engine | ✅ |
| Admin UI for organization setup | ✅ |
| Seed: 6 departments, skills, queues | ✅ |

---

## Phase 4: Customers & Conversations Core ✅

**Goal**: Customer profiles, conversations, messages, tags, internal notes.

| Deliverable | Status |
|-------------|--------|
| Customers module | ✅ |
| Conversations module (CRUD, status lifecycle) | ✅ |
| Messages module with attachments (MinIO) | ✅ |
| Tags and internal notes | ✅ |
| Conversation locking & assignment | ✅ |
| Customer timeline | ✅ |
| Seed: 100 customers, 500 conversations, 1000 messages | ✅ |

---

## Phase 5: Real-Time & Socket.IO ✅

**Goal**: Live updates across dashboard, inbox, queue, simulator.

| Deliverable | Status |
|-------------|--------|
| Socket.IO gateway (NestJS) | ✅ |
| Room-based subscriptions (agent, department, conversation) | ✅ |
| Real-time message delivery | ✅ |
| Typing indicators | ✅ |
| Agent status broadcasts | ✅ |
| Angular Socket service | ✅ |
| Dashboard live stats | ✅ |

---

## Phase 6: WhatsApp Simulator ✅

**Goal**: Fake WhatsApp phone UI for end-to-end demos without Meta APIs.

| Deliverable | Status |
|-------------|--------|
| Phone-frame UI component | ✅ |
| Multi-customer simulator | ✅ |
| Text, image, document, audio support | ✅ |
| Typing, delivered, seen, online/offline | ✅ |
| 24-hour window indicator | ✅ |
| Bidirectional sync with inbox | ✅ |
| WhatsApp adapter interface (mock + real stub) | ✅ |

---

## Phase 7: AI Bot Engine ✅

**Goal**: Rule-based bot with intent detection, queue routing, AI summary.

| Deliverable | Status |
|-------------|--------|
| Bot adapter interface | ✅ |
| Intent rules (refund, hotel, flight, complaint, general) | ✅ |
| Realistic bot responses | ✅ |
| Auto queue assignment on transfer | ✅ |
| AI summary generation | ✅ |
| Bot-to-human handoff flow | ✅ |

---

## Phase 8: Agent Inbox UI ✅

**Goal**: Three-pane Intercom-style inbox.

| Deliverable | Status |
|-------------|--------|
| Conversation list with filters & search | ✅ |
| Message thread with media | ✅ |
| Customer profile panel | ✅ |
| Reply box with rich media | ✅ |
| Transfer, resolve, close actions | ✅ |
| Internal notes | ✅ |
| AI summary display | ✅ |
| Read status & typing indicators | ✅ |

---

## Phase 9: Dashboard & Analytics ✅

**Goal**: Executive dashboard, charts, agent performance.

| Deliverable | Status |
|-------------|--------|
| Dashboard stats API | ✅ |
| KPI cards (open, closed, waiting, SLA, etc.) | ✅ |
| ApexCharts integration | ✅ |
| Conversation trend chart | ✅ |
| Department distribution | ✅ |
| Agent performance & utilization | ✅ |
| Real-time dashboard updates | ✅ |

---

## Phase 10: Salesforce & Bookings Integration

**Goal**: Case sync and booking lookup with adapter pattern.

| Deliverable | Status |
|-------------|--------|
| Salesforce adapter interface | ⬜ |
| Mock Salesforce adapter | ⬜ |
| Case create/update on conversation events | ⬜ |
| Booking lookup module | ⬜ |
| Customer profile booking display | ⬜ |

---

## Phase 11: Reports & CSAT

**Goal**: Operational reports, SLA, CSAT, exports.

| Deliverable | Status |
|-------------|--------|
| Reports API (department, agent, conversation, bot) | ⬜ |
| SLA tracking & breach alerts | ⬜ |
| CSAT survey flow | ⬜ |
| CSV/Excel export | ⬜ |
| Reports UI with date filters | ⬜ |

---

## Phase 12: Administration & Campaigns

**Goal**: Full admin panel, templates, campaigns, audit.

| Deliverable | Status |
|-------------|--------|
| Admin UI (users, roles, departments, settings) | ⬜ |
| Template management | ⬜ |
| Campaign engine (BullMQ) | ⬜ |
| WhatsApp number management | ⬜ |
| Audit log viewer | ⬜ |
| White-label settings | ⬜ |

---

## Phase 13: Testing, Polish & Production Readiness

**Goal**: E2E tests, performance, final polish.

| Deliverable | Status |
|-------------|--------|
| API unit tests (all modules) | ⬜ |
| Cypress E2E (auth, inbox, simulator) | ⬜ |
| Error boundaries & empty states | ⬜ |
| Skeleton loaders & animations | ⬜ |
| Production Docker build verification | ⬜ |
| Final documentation review | ⬜ |

---

## Architecture Principles

1. **Adapter Pattern** — WhatsApp, Salesforce, AI, and Booking integrations use interfaces with mock implementations. Swap adapters without changing business logic.
2. **DDD + Clean Architecture** — Feature modules with clear boundaries: domain, application, infrastructure.
3. **CQRS where useful** — Separate read/write paths for reports and dashboard queries.
4. **Real-time first** — All state changes broadcast via Socket.IO.
5. **Enterprise patterns** — Repository pattern, DTO validation, global exception filter, audit logging.
