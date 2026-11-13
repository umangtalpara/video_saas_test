---
name: "auth"
description: "JWT authentication and RBAC for the NestJS backend and Next.js frontend: register, login, refresh rotation, password reset, lockout, guards and cookies. Use when implementing authentication or authorization."
---

# Authentication & Authorization Skill

The PRD's "Authentication (Built-in)" section is implemented with this skill in PHASE-01.

## Tokens

- Default: **HS256** signed with `JWT_SECRET` (≥ 32 chars, random, from env). Use **RS256** (`JWT_PRIVATE_KEY` / `JWT_PUBLIC_KEY`) when other services must verify tokens.
- Access token 15 min (`JWT_ACCESS_EXPIRY`), refresh token 7 days (`JWT_REFRESH_EXPIRY`).
- **Refresh rotation**: every refresh issues a new refresh token and invalidates the old one. Store a hash of the current refresh token (per device/session) in the DB or Redis; reuse of an old token revokes the whole session family.
- Deliver refresh tokens in an `httpOnly; Secure; SameSite=Lax` cookie; the access token is returned in the body (kept in memory on the frontend, never localStorage).

## Endpoints (all under `/api/v1/auth`)

| Endpoint | Notes |
|----------|-------|
| `POST /register` | validate DTO, bcrypt (12 rounds), 409 on duplicate email, emit `auth.user.registered` (welcome/verify email job) |
| `POST /login` | same generic error for unknown email / bad password; throttle 5/min/IP |
| `POST /refresh` | rotation as above |
| `POST /logout` | revoke current session |
| `POST /forgot-password` | always respond 200; single-use token, 1 h expiry, stored hashed |
| `POST /reset-password` | consume token, revoke all sessions |
| `GET /me` | current user without secrets |

## Lockout

After `MAX_LOGIN_ATTEMPTS` (5) failures lock the account for `LOCKOUT_DURATION_MINUTES` (30); count in Redis (if chosen) or on the user record. Reset on success.

## Guards & RBAC

- `JwtAuthGuard` global (APP_GUARD) + `@Public()` decorator to opt out.
- `RolesGuard` + `@Roles(UserRole.ADMIN)`; enforce again in services for resource ownership (prevents IDOR).
- Roles come from the PRD "User Roles & Permissions" table; keep the enum in one place (shared package in monorepo).
- With multi-tenancy see the `multi-tenancy` skill — role checks are always scoped to the tenant.

## Frontend

- `auth.store.ts` (Zustand) holds user + access token in memory; `api-client.ts` attaches `Authorization` and retries once on 401 via `/refresh`.
- Route protection with Next.js middleware checking the refresh cookie for page gating, plus server-validated data on every API call.
- Forms: React Hook Form + Zod mirroring backend DTO rules.

## Tests

Unit: password hashing, lockout counter, token rotation reuse detection. Integration: full register → login → refresh → logout, duplicate email, locked account, expired reset token.
