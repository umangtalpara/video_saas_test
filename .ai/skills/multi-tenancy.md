---
name: "multi-tenancy"
description: "Multi-tenant SaaS data isolation and tenant-scoped RBAC for NestJS (MongoDB or SQL). Use when Discovery Q6 chose multi-tenant, or when adding any entity, query or endpoint in a multi-tenant project."
---

# Multi-Tenancy Skill

Applies when `state.stack.multiTenant` is true. For single-organization apps skip tenant fields entirely.

## Model

- Strategy: **shared database, shared schema, `tenantId` discriminator** (default). Propose schema-per-tenant or database-per-tenant only if the PRD demands hard isolation/compliance; record the decision in `decisions.md`.
- Entities: `Tenant` (organization: name, slug, plan, status, settings) and a membership linking `User` ↔ `Tenant` with a role. A user may belong to several tenants.
- Every tenant-owned entity has a required, indexed `tenantId`. Compound indexes start with `tenantId` (e.g. `{ tenantId: 1, email: 1 }` unique per tenant).

## Request scoping

1. JWT carries `sub` and the **active** `tenantId` (switching tenants issues a new token).
2. `TenantContext` (request-scoped provider or `AsyncLocalStorage`) exposes the tenant for the request.
3. A `TenantGuard` rejects requests whose token tenant is inactive/suspended or where the user has no membership.
4. **Repositories** always add `tenantId` to every filter, update and delete; the tenant id comes from `TenantContext`, **never from the request body or query**.
   - Mongoose: base repository helper that injects `{ tenantId }`; optionally a plugin on schemas that enforces it on `find*/update*/delete*`.
   - Prisma: a client extension (`$extends`) that injects `where: { tenantId }` and `data.tenantId`.
5. Cache keys, queue job payloads, file storage paths and websocket rooms are prefixed with the tenant id.

## Roles

- Platform roles (`SUPER_ADMIN`) are separate from tenant roles (`OWNER`, `ADMIN`, `MEMBER`, …). Super admins act on tenants only through explicit admin endpoints.
- Authorization = membership role in the active tenant + resource ownership checks.

## Testing (mandatory)

- For each module: a test that user A in tenant 1 **cannot read, update or delete** tenant 2's records (expect 404, not 403, to avoid leaking existence).
- Test unique constraints are per tenant, and that list endpoints never return other tenants' data.

## Review checklist

- [ ] Every query path includes `tenantId`
- [ ] No endpoint accepts `tenantId` from the client for scoping
- [ ] Indexes lead with `tenantId`
- [ ] Jobs/cache/storage keys are tenant-prefixed
