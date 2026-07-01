# HELIX API Reference

Base URL: `http://localhost:3000/api`

Swagger UI: `http://localhost:3000/api/docs`

## Response Format

All successful responses are wrapped:

```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2026-06-29T12:00:00.000Z"
}
```

Error responses:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-06-29T12:00:00.000Z",
  "path": "/api/users"
}
```

## Authentication

All protected endpoints require:

```
Authorization: Bearer <access_token>
```

### Endpoints (Phase 2)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/auth/login` | Login with email/password |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Revoke refresh token |
| GET | `/auth/me` | Current user profile |

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check with DB status |
| GET | `/` | No | API welcome message |

## Users (Phase 2)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/users` | `users:read` | List users (paginated) |
| GET | `/users/:id` | `users:read` | Get user by ID |
| POST | `/users` | `users:create` | Create user |
| PATCH | `/users/:id` | `users:update` | Update user |
| DELETE | `/users/:id` | `users:delete` | Soft delete user |

## Departments (Phase 3)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/departments` | `departments:read` | List departments |
| GET | `/departments/:id` | `departments:read` | Get department detail |
| POST | `/departments` | `departments:create` | Create department |
| PATCH | `/departments/:id` | `departments:update` | Update department |
| DELETE | `/departments/:id` | `departments:delete` | Soft delete department |
| GET | `/departments/:id/business-hours` | `departments:read` | List business hours |
| POST | `/departments/:id/business-hours` | `departments:update` | Add business hour |
| PATCH | `/departments/:id/business-hours/:hourId` | `departments:update` | Update business hour |
| DELETE | `/departments/:id/business-hours/:hourId` | `departments:update` | Remove business hour |

## Skills (Phase 3)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/skills` | `skills:read` | List skills |
| GET | `/skills/:id` | `skills:read` | Get skill detail |
| POST | `/skills` | `skills:create` | Create skill |
| PATCH | `/skills/:id` | `skills:update` | Update skill |
| DELETE | `/skills/:id` | `skills:delete` | Soft delete skill |
| POST | `/skills/users/:userId/assign` | `skills:update` | Assign skill to user |
| DELETE | `/skills/users/:userId/:skillId` | `skills:update` | Remove skill from user |

## Queues (Phase 3)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/queues` | `queues:read` | List queues |
| GET | `/queues/:id` | `queues:read` | Get queue detail |
| POST | `/queues` | `queues:create` | Create queue |
| PATCH | `/queues/:id` | `queues:update` | Update queue |
| DELETE | `/queues/:id` | `queues:delete` | Soft delete queue |
| POST | `/queues/calculate-priority` | `queues:read` | Calculate priority score |
| POST | `/queues/:id/route` | `queues:update` | Select next agent |

## Availability (Phase 3)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/availability` | `users:read` | List all agent availability |
| GET | `/availability/summary` | `users:read` | Summary by status |
| GET | `/availability/me` | Authenticated | Current agent status |
| PATCH | `/availability/me` | Authenticated | Update status |
| POST | `/availability/me/break/start` | Authenticated | Start break |
| POST | `/availability/me/break/end` | Authenticated | End break |

## Customers (Phase 4)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/customers` | `conversations:read` | List customers (paginated) |
| GET | `/customers/:id` | `conversations:read` | Get customer detail |
| GET | `/customers/:id/timeline` | `conversations:read` | Customer activity timeline |
| POST | `/customers` | `conversations:create` | Create customer |
| PATCH | `/customers/:id` | `conversations:update` | Update customer |
| DELETE | `/customers/:id` | `conversations:delete` | Soft delete customer |

## Bookings (Phase 10)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/bookings` | `conversations:read` | List bookings (paginated, optional `reference` filter) |
| GET | `/bookings/lookup` | `conversations:read` | Lookup booking by `reference` query param |
| GET | `/bookings/customers/:customerId` | `conversations:read` | Bookings for a customer |

Conversation detail (`GET /conversations/:id`) includes `salesforceCase` when synced.

## Conversations (Phase 4)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/conversations` | `conversations:read` | List conversations |
| GET | `/conversations/:id` | `conversations:read` | Get conversation detail |
| POST | `/conversations` | `conversations:create` | Create conversation |
| PATCH | `/conversations/:id` | `conversations:update` | Update conversation |
| PATCH | `/conversations/:id/assign` | `conversations:assign` | Assign to agent |
| PATCH | `/conversations/:id/transfer` | `conversations:transfer` | Transfer department |
| PATCH | `/conversations/:id/resolve` | `conversations:update` | Resolve conversation |
| PATCH | `/conversations/:id/close` | `conversations:update` | Close conversation |
| PATCH | `/conversations/:id/lock` | `conversations:update` | Lock conversation |
| PATCH | `/conversations/:id/unlock` | `conversations:update` | Unlock conversation |
| GET | `/conversations/tags` | `conversations:read` | List tags |
| POST | `/conversations/tags` | `conversations:update` | Create tag |
| POST | `/conversations/:id/tags` | `conversations:update` | Add tag to conversation |
| DELETE | `/conversations/:id/tags/:tagId` | `conversations:update` | Remove tag |
| GET | `/conversations/:id/notes` | `conversations:read` | List internal notes |
| POST | `/conversations/:id/notes` | `conversations:update` | Add internal note |

## Messages (Phase 4)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/conversations/:id/messages` | `messages:read` | List messages |
| POST | `/conversations/:id/messages` | `messages:create` | Send message (JSON or multipart with `file`) |

## Simulator (Phase 6)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/simulator/customers` | `conversations:read` | List customers for simulator |
| GET | `/simulator/customers/:id` | `conversations:read` | Customer + active conversation state |
| GET | `/simulator/customers/:id/messages` | `messages:read` | Messages in active conversation |
| POST | `/simulator/customers/:id/messages` | `messages:create` | Send as customer (JSON or multipart) |
| PATCH | `/simulator/customers/:id/presence` | `conversations:update` | Toggle online/offline |
| POST | `/simulator/customers/:id/read` | `messages:read` | Mark agent messages as read |

## Bot (Phase 7)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/bot/intents` | `conversations:read` | List intent rules and queue mappings |
| POST | `/bot/conversations/:id/handoff` | `conversations:transfer` | Trigger bot-to-human handoff |
| POST | `/bot/conversations/:id/summary` | `conversations:update` | Regenerate AI conversation summary |

## Dashboard (Phase 5 & 9)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/dashboard/stats` | `reports:read` | Real-time KPI stats |
| GET | `/dashboard/analytics` | `reports:read` | Trends, department distribution, agent performance (`?days=7`) |

## Reports (Phase 11)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/reports` | `reports:read` | Full reports bundle (`?from=&to=`) |
| GET | `/reports/summary` | `reports:read` | Summary KPIs for date range |
| GET | `/reports/departments` | `reports:read` | Department performance |
| GET | `/reports/agents` | `reports:read` | Agent performance |
| GET | `/reports/conversations` | `reports:read` | Paginated conversation report |
| GET | `/reports/bot` | `reports:read` | Bot handoff and intent breakdown |
| GET | `/reports/sla` | `reports:read` | SLA compliance and breaches |
| GET | `/reports/csat` | `reports:read` | CSAT satisfaction report |
| GET | `/reports/export` | `reports:read` | CSV export (`?type=agents&format=csv&from=&to=`) |

## CSAT (Phase 11)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| POST | `/csat` | `conversations:read` | Submit CSAT rating |
| GET | `/csat/conversations/:id` | `conversations:read` | Get survey for conversation |
| POST | `/simulator/customers/:id/csat` | `conversations:read` | Submit CSAT from simulator |

## Administration (Phase 12)

### Settings & White-label

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/settings/public` | Public | Public settings key-value map |
| GET | `/settings/white-label` | Public | Branding settings |
| GET | `/settings` | `settings:read` | List all settings |
| PATCH | `/settings/white-label` | `settings:update` | Update branding |
| PATCH | `/settings/:key` | `settings:update` | Update setting by key |

### Templates

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/templates` | `templates:read` | List templates |
| GET | `/templates/:id` | `templates:read` | Get template |
| POST | `/templates` | `templates:create` | Create template |
| PATCH | `/templates/:id` | `templates:update` | Update template |
| DELETE | `/templates/:id` | `templates:delete` | Soft delete template |

### WhatsApp Numbers

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/whatsapp-numbers` | `settings:read` | List numbers |
| POST | `/whatsapp-numbers` | `settings:update` | Register number |
| PATCH | `/whatsapp-numbers/:id` | `settings:update` | Update number |
| DELETE | `/whatsapp-numbers/:id` | `settings:update` | Soft delete number |

### Campaigns

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/campaigns` | `campaigns:read` | List campaigns |
| GET | `/campaigns/:id` | `campaigns:read` | Get campaign |
| GET | `/campaigns/:id/recipients` | `campaigns:read` | List recipients |
| POST | `/campaigns` | `campaigns:create` | Create campaign with recipients |
| POST | `/campaigns/:id/start` | `campaigns:update` | Start campaign (BullMQ) |
| POST | `/campaigns/:id/cancel` | `campaigns:update` | Cancel campaign |

### Audit

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/audit` | `audit:read` | Paginated audit logs |

## WebSocket Events (Phase 5)

Connect to the app origin (proxied to the API) with JWT token in `auth.token`.

| Event | Direction | Payload |
|-------|-----------|---------|
| `message:received` | Server → Client | `{ conversationId, message }` |
| `conversation:assigned` | Server → Client | `{ conversationId, agentId, conversation }` |
| `conversation:updated` | Server → Client | `{ conversation }` |
| `typing:start` | Bidirectional | `{ conversationId, userId }` |
| `typing:stop` | Bidirectional | `{ conversationId, userId }` |
| `agent:status_changed` | Server → Client | `{ userId, status, since }` |
| `dashboard:stats_updated` | Server → Client | Dashboard KPI object |
| `sla:breach` | Server → Client | SLA breach alert |
| `subscribe:simulator` | Client → Server | `{ customerId }` |
| `unsubscribe:simulator` | Client → Server | `{ customerId }` |
| `simulator:message` | Server → Client | Inbound/outbound message sync |
| `simulator:status` | Server → Client | Online status, 24h window updates |
| `bot:handoff` | Server → Client | Bot transferred conversation to human queue |

Client commands:

| Event | Payload |
|-------|---------|
| `subscribe:conversation` | `{ conversationId }` |
| `unsubscribe:conversation` | `{ conversationId }` |

## Pagination

Query parameters for list endpoints:

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `pageSize` | number | 20 | Items per page (max 100) |
| `sortBy` | string | createdAt | Sort field |
| `sortOrder` | asc/desc | desc | Sort direction |

Paginated response:

```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "pageSize": 20,
    "totalPages": 5
  }
}
```
