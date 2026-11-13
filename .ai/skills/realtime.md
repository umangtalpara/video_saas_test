---
name: "realtime"
description: "Real-time features with WebSockets (Socket.IO) or Server-Sent Events in NestJS and Next.js: auth, rooms, scaling with Redis, reconnection. Use when Discovery Q11 chose WebSockets or SSE, or for live notifications and updates."
---

# Real-Time Skill

Applies when `state.stack.realtime` is WebSockets or SSE. If skipped, use plain polling/refetch.

## Choosing

- **SSE** (`@Sse()` returning `Observable<MessageEvent>`): one-way server → client (notifications, progress, feeds). Simple, works through proxies, auto-reconnect.
- **WebSockets / Socket.IO** (`@nestjs/websockets`, `@nestjs/platform-socket.io`): two-way (chat, collaboration, presence).

## Backend (Socket.IO)

- One `*.gateway.ts` per domain (`notifications.gateway.ts`), thin: validate payload (DTO + `ValidationPipe`), delegate to services.
- **Authenticate on connect**: read the access token from `handshake.auth.token`, verify with the same JWT service, disconnect on failure; attach `userId` (and `tenantId`) to `socket.data`.
- **Rooms**: `user:<id>`, `tenant:<tenantId>`, `resource:<id>`; join only after an authorization check. Never trust a room name from the client.
- Restrict CORS to `CORS_ORIGINS`; rate-limit message events.
- **Scaling**: with Redis chosen use the `@socket.io/redis-adapter` so several instances share rooms; without Redis run a single instance and document the limit in `decisions.md`.
- Emit domain events through the event bus (`auth.user.registered`, `orders.order.updated`) and let a listener push to rooms — services do not import gateways.

## Frontend

- One socket client in `src/lib/socket.ts`, created after login with `auth: { token }`, closed on logout. Reconnect with backoff; refresh the token on `connect_error` with 401.
- Bridge events into React Query (`queryClient.setQueryData` / `invalidateQueries`) or a Zustand store — components never subscribe to the raw socket.
- SSE: `EventSource` cannot set headers → use a short-lived signed token in the query string or fetch-based SSE.

## Testing

Integration test with `socket.io-client` against the Nest test app: unauthenticated connection rejected, user only receives own-room events, tenant isolation.
