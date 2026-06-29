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

## Conversations (Phase 4)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/conversations` | `conversations:read` | List conversations |
| GET | `/conversations/:id` | `conversations:read` | Get conversation detail |
| PATCH | `/conversations/:id/assign` | `conversations:assign` | Assign to agent |
| PATCH | `/conversations/:id/transfer` | `conversations:transfer` | Transfer department |
| PATCH | `/conversations/:id/resolve` | `conversations:resolve` | Resolve conversation |
| PATCH | `/conversations/:id/close` | `conversations:close` | Close conversation |

## Messages (Phase 4)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/conversations/:id/messages` | `messages:read` | List messages |
| POST | `/conversations/:id/messages` | `messages:create` | Send message |

## Dashboard (Phase 9)

| Method | Path | Permission | Description |
|--------|------|------------|-------------|
| GET | `/dashboard/stats` | `reports:read` | Real-time KPI stats |
| GET | `/dashboard/trends` | `reports:read` | Conversation trends |
| GET | `/dashboard/agents` | `reports:read` | Agent performance |

## WebSocket Events

Connect to `ws://localhost:3000` with JWT token.

See `packages/shared/src/lib/socket-events.ts` for the full event catalog.

| Event | Direction | Payload |
|-------|-----------|---------|
| `message:received` | Server → Client | `{ conversationId, message }` |
| `conversation:assigned` | Server → Client | `{ conversationId, agentId }` |
| `typing:start` | Bidirectional | `{ conversationId, userId }` |
| `dashboard:stats_updated` | Server → Client | `{ stats }` |

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
