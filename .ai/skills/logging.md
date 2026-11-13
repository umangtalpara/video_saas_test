---
name: "logging"
description: "Structured logging and observability in NestJS with Winston plus Datadog, ELK or CloudWatch: request IDs, redaction, health checks, metrics. Use when setting up logging, monitoring, error tracking or health endpoints."
---

# Logging & Observability Skill

Provider comes from `state.stack.loggingProvider` (Discovery Q9). "Skip" means **console JSON logs only** (still structured).

## Logger

- Winston via `nest-winston` replaces the Nest logger (`app.useLogger(...)`). JSON format in staging/production, pretty in development. Level from `LOG_LEVEL`.
- Transports by choice: Datadog (`dd-trace` + `DD_*` env, JSON logs with `dd.trace_id`), ELK (`winston-elasticsearch` or ship stdout with Filebeat — prefer stdout in containers), CloudWatch (`winston-cloudwatch` or the awslogs driver).
- Wrap in an internal `AppLogger`; business code uses `private readonly logger = new Logger(MyService.name)`.

## Request correlation

- `RequestIdMiddleware`: accept `x-request-id` or generate a UUID, store in `AsyncLocalStorage`, echo in the response header, and add to every log line (plus `userId`/`tenantId` when known).
- `LoggingInterceptor` logs method, route (not full URL with query secrets), status, duration; slow-request warning above a threshold.
- `AllExceptionsFilter` logs 5xx with stack and request id; 4xx at `warn` without stack.

## Redaction (mandatory)

Never log passwords, tokens, cookies, `Authorization`, card data, reset links or full emails. Configure a Winston format that masks keys: `password`, `token`, `refreshToken`, `authorization`, `cookie`, `secret`, `apiKey`.

## Health & metrics

- `@nestjs/terminus` `/health` (liveness) and `/health/ready` (DB, Redis, queue ping) — used by Docker/K8s/PaaS health checks.
- Optional Prometheus metrics endpoint (`prom-client`) guarded by network policy or token.
- Frontend errors: capture with an error boundary and send to the same backend endpoint or a provider SDK if chosen.

## Testing

Assert that logs include the request id, and unit-test the redaction format with nested objects.
