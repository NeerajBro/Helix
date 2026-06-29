# HELIX Coding Standards

## General Principles

1. **Minimize scope** — Focused changes that solve the problem without unrelated modifications
2. **Match conventions** — Follow existing patterns in the codebase
3. **Production ready** — No placeholder implementations unless marked `TODO`
4. **Test meaningful behavior** — Unit tests for business logic, not trivial getters

## TypeScript

- Strict mode enabled
- No `any` — use `unknown` and narrow types
- Prefer interfaces for DTOs and shared types in `@helix/types`
- Use enums from `@helix/types` or Prisma-generated enums — don't duplicate

## NestJS (API)

### Module Structure

```
modules/
  auth/
    auth.module.ts
    auth.controller.ts
    auth.service.ts
    dto/
      login.dto.ts
    guards/
      jwt-auth.guard.ts
    strategies/
      jwt.strategy.ts
    auth.service.spec.ts
```

### Conventions

- One feature per module
- DTOs with `class-validator` decorators for all inputs
- Swagger decorators on all controller endpoints
- Services contain business logic; repositories handle data access
- Use `@helix/types` for response interfaces
- Global filters/interceptors — don't duplicate per module

### Naming

| Type | Convention | Example |
|------|-----------|---------|
| Module | `{feature}.module.ts` | `users.module.ts` |
| Controller | `{feature}.controller.ts` | `users.controller.ts` |
| Service | `{feature}.service.ts` | `users.service.ts` |
| DTO | `{action}-{entity}.dto.ts` | `create-user.dto.ts` |
| Guard | `{name}.guard.ts` | `permissions.guard.ts` |

## Angular (Web)

### Structure

```
features/
  inbox/
    components/
    services/
    inbox.routes.ts
core/
  auth/
  layout/
  services/
shared/
  components/
  pipes/
```

### Conventions

- Standalone components (no NgModules)
- Angular Signals for component state
- RxJS for async streams and HTTP
- Feature-based folder structure
- Shared UI components in `@helix/ui` package
- SCSS with design tokens from `styles.scss`

## Database (Prisma)

- UUID primary keys
- `createdAt`, `updatedAt` on all models
- `deletedAt` for soft deletes on core entities
- snake_case column names with `@map`
- Indexes on foreign keys and frequently queried fields
- Use transactions for multi-table operations

## Git

- Conventional commit messages: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- One logical change per commit
- Update CHANGELOG.md and PROJECT_PROGRESS.md after each phase

## Testing

- Jest for unit tests (API and Web)
- Cypress for E2E tests
- Test file co-located: `{name}.spec.ts`
- Mock external services (Prisma, Redis, adapters) in unit tests

## API Design

- RESTful endpoints with consistent naming
- Paginated list responses
- Wrapped responses via TransformInterceptor
- Bearer token authentication on protected routes
- Permission-based authorization

## Real-Time

- Use event constants from `@helix/shared` (`SOCKET_EVENTS`)
- Room-based subscriptions
- Never emit sensitive data to unauthorized rooms
