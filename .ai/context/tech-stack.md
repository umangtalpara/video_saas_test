---
name: "tech-stack"
description: "Supported technologies, versions and compatibility notes for backend, frontend, databases, caching and testing."
---

# Tech Stack

The technologies utilized in this project are dynamically determined during the Discovery Q&A Phase. Below are the supported technologies and configurations.

## Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Node.js** | 24 LTS | JavaScript runtime |
| **NestJS** | 11.x | Progressive Node.js framework |
| **TypeScript** | 5.x | Type-safe JavaScript (strict mode) |
| **Passport** | 0.7.x | Authentication middleware |
| **passport-jwt** | 4.x | JWT authentication strategy |
| **bcrypt** | 5.x | Password hashing |
| **class-validator** | 0.14.x | Request validation decorators |
| **class-transformer** | 0.5.x | Object transformation |
| **@nestjs/swagger** | 11.x | OpenAPI documentation |
| **@nestjs/config** | 4.x | Configuration management |
| **@nestjs/throttler** | 6.x | Rate limiting |
| **@nestjs/cache-manager** | 3.x (+ cache-manager 6, @keyv/redis) | Caching abstraction (supports Redis or Local In-Memory) |
| **Winston** | 3.x | Structured logging |
| **helmet** | 8.x | HTTP security headers |
| **Joi** | 17.x | Configuration validation |
| **uuid** | 9.x | UUID generation |

## Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | 14.x | React framework (App Router) |
| **React** | 18.x | UI component library |
| **TypeScript** | 5.x | Type-safe JavaScript (strict mode) |
| **Tailwind CSS** | 3.x | Utility-first CSS framework |
| **Shadcn UI** | CLI `shadcn@2.3.0` | Accessible component primitives (pinned: the shadcn docs direct Tailwind v3 projects to `shadcn@2.3.0`; `@latest` defaults to Tailwind v4 / React 19) |
| **Radix UI** | Latest | Headless UI primitives (via Shadcn) |
| **Zustand** | 4.x | Client state management |
| **TanStack React Query** | 5.x | Server state management |
| **React Hook Form** | 7.x | Form state management |
| **Zod** | 3.x | Schema validation |
| **Framer Motion** | 11.x | Animation library |
| **Lucide React** | Latest | Icon library |
| **Axios** | 1.x | HTTP client |
| **clsx** | 2.x | Conditional class names |
| **tailwind-merge** | 2.x | Tailwind class conflict resolution |
| **next-themes** | Latest | Theme management (light/dark) |
| **date-fns** | 3.x | Date utility library |

## Databases (Choose One)

* **MongoDB** (Version 7.x) with **Mongoose** (8.x ODM) - Suitable for flexible document schemas and transaction support.
* **PostgreSQL / MySQL** with **Prisma ORM** (5.x) - Suitable for strict SQL relational schemas. See the `prisma-sql` skill.

## Caching & Background Queues (Conditional)

* **Redis Engine** (7.x) + **BullMQ** (5.x): 
  * Required if PRD specifies high-performance queues, rate limiting, or distributed sessions.
* **Local In-Memory Cache**:
  * Used if the user opts out of Redis setup to reduce infrastructure overhead. Background scheduling reverts to NestJS built-in `@nestjs/schedule` (cron and timeout jobs).

## Storage, Logging & Integrations (Optional/Skippable)

* **File Storage**:
  * Cloud: AWS S3 or DigitalOcean Spaces.
  * Local: Local server-side filesystem (hot-folder).
* **Logging Managers**:
  * Cloud: Datadog, ELK stack, or AWS CloudWatch.
  * Local: Console-only logs using Winston formatted JSON outputs.
* **Payment Gateways**:
  * Optional: Stripe, PayPal, or Razorpay integrations (configured only if present in the PRD).
* **Real-time Engine**:
  * Optional: WebSockets (Socket.io) or Server-Sent Events (SSE).

## Testing

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Jest** | 29.x | Unit and integration test runner |
| **Supertest** | Latest | HTTP assertion for integration tests |
| **Playwright** | Latest | End-to-end browser testing |
| **@testing-library/react** | Latest | React component testing |
| **ts-jest** | 29.x | TypeScript support for Jest |

## DevOps (Optional)

* **Docker & Docker Compose**: Used to run databases, cache, and app services in containers for development and local staging. Skip if manual deployment is preferred.
* **GitHub Actions**: Pipeline config for automatic build verification and test runner.

## Version Compatibility Notes

- Node.js 24 LTS is the supported runtime (Node 22 LTS also works).
- NestJS 11.x requires Node.js 18+ and TypeScript 5.0+.
- Next.js 14.x requires React 18.x and Node.js 18+.
- Mongoose 8.x and Prisma 5.x require Node.js 16+ and have strict type checking.
- Versions in this file are the **tested set**: `scaffold-starter.js` generates `package.json` files whose dependency trees were verified to resolve against NestJS 11 / Next.js 14 (no peer conflicts). Nest-ecosystem packages must match the Nest major (e.g. `@nestjs/swagger` 11, `@nestjs/config` 4, `@nestjs/schedule` 6, `@nestjs/cache-manager` 3).
- MongoDB transactions need a replica set (single-node replica set in docker-compose, or Atlas).

## Upgrade Path (decision recorded, not yet applied)

The registry has newer majors: NestJS 12, Next.js 16, React 19, Tailwind CSS 4, Prisma 7. This factory deliberately stays on NestJS 11 / Next.js 14 / React 18 / Tailwind 3 / Prisma 5 because every agent, skill and template is written against them. Treat an upgrade as its own project: bump `tech-stack.md`, `settings.json`, `scaffold-starter.js`, then adjust the skills/templates and re-run the test pipeline. Keep Next.js 14 on the latest 14.2.x patch for security fixes.
