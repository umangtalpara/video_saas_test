# Roadmap — VideoForge AI

## Executive Architecture & Strategy

VideoForge AI is an enterprise-grade multi-tenant SaaS that enables users to generate complete AI videos using their own API keys (Bring Your Own Key — BYOK). Each scene in a generated video is an authentic moving video clip returned by a video-generation model API (e.g., Alibaba Wan, Google, etc.). Completed scenes and final concatenated MP4 files are stored securely in a central Amazon S3 bucket with tenant-scoped keys.

### Core Stack & Design Decisions
- **Repository & Structure**: Decoupled standalone projects (`codebase/backend` and `codebase/frontend`) optimized for independent cloud deployments (Next.js on Vercel, NestJS API on Render).
- **Backend**: NestJS 11.x, TypeScript strict, modular monolith architecture with layered modules (`controller` → `service` → `repository` → `schema`).
- **Frontend**: Next.js 14 App Router, React 18, Tailwind CSS 3, Shadcn UI, Zustand store, TanStack React Query, Axios with JWT refresh interceptors.
- **Database**: MongoDB 7.x + Mongoose 8.x with replica set transaction support and compound indexes for fast tenant querying.
- **Caching & Queues**: Local in-memory caching (`cache-manager`) and asynchronous in-process queue with `@nestjs/schedule` for polling and background job management.
- **BYOK Security**: AES-256-GCM envelope encryption for API credentials at rest with unique IVs and authentication tags. Plaintext keys are never returned to the frontend or written to logs.
- **Media Storage**: Amazon S3 private bucket with tenant-scoped prefix keys (`users/{userId}/projects/{projectId}/...`), server-side encryption, and short-lived presigned URLs for preview/download.
- **Video Assembly**: Dedicated FFmpeg engine for clip normalization (H.264/AAC), sequence concatenation, narration & background audio mixing, and subtitle burn-in.
- **Observability**: Structured Winston logging with correlation IDs, token redaction, and Datadog APM integration.

---

## Database Schemas Overview (MongoDB / Mongoose)

1. **`users`**: User identity, hashed credentials (bcrypt), roles (`user`, `admin`, `support`), email verification status, and UI preferences.
2. **`provider_catalog`**: Dynamic registry of supported video providers (slug, name, endpoints, auth types, capabilities, billing classification, free quota policy).
3. **`provider_models`**: Supported models per provider, aspect ratios (9:16, 16:9, 1:1), supported durations, resolutions, and pricing metadata.
4. **`user_provider_connections`**: User-connected BYOK credentials with AES-256-GCM encrypted payload, connection health status, and user-configured limits.
5. **`video_projects`**: Video project definition, prompt idea, target duration, aspect ratio, style, script JSON, scene counts, and status state machine.
6. **`video_scenes`**: Granular scenes for each project (narration, visual prompt, planned duration, provider/model assignment, remote provider job ID, clip status).
7. **`media_assets`**: S3-backed asset metadata (original clips, normalized clips, audio tracks, subtitles, final MP4, poster thumbnail, duration, codec, file size).
8. **`generation_jobs`**: Job tracking record with idempotency keys, execution attempts, latency, and sanitized error logs.
9. **`provider_usage`**: Audit trail of provider API consumption, reported vs. estimated cost, and units for quota enforcement.
10. **`user_storage_usage`**: Aggregated storage tracking (bytes used, asset count) per tenant.
11. **`audit_logs`**: Security events, credential changes, project deletion, and admin actions.

---

## REST API Contract Summary (`/api/v1`)

- **Auth**: `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/verify-email`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- **Providers**: `GET /providers`, `GET /providers/:id`, `GET /providers/:id/models`
- **BYOK Connections**: `GET /provider-connections`, `POST /provider-connections`, `POST /provider-connections/:id/test`, `PATCH /provider-connections/:id`, `DELETE /provider-connections/:id`
- **Projects & Script**: `GET /projects`, `POST /projects`, `GET /projects/:id`, `PATCH /projects/:id`, `DELETE /projects/:id`, `POST /projects/:id/script/generate`, `PATCH /projects/:id/script`, `POST /projects/:id/script/approve`
- **Generation**: `POST /projects/:id/generate`, `GET /projects/:id/progress`, `POST /projects/:id/cancel`, `POST /projects/:id/retry-failed`, `POST /projects/:id/scenes/:sceneId/regenerate`
- **Rendering & Assets**: `POST /projects/:id/render`, `GET /projects/:id/render-status`, `GET /projects/:id/download`, `GET /assets/:id/download-url`
- **Usage & Limits**: `GET /usage/summary`, `GET /usage/providers`, `GET /limits`, `PATCH /limits`
- **Admin**: `GET /admin/dashboard`, `GET /admin/users`, `PATCH /admin/users/:id/status`, `GET/PATCH /admin/providers`, `POST /admin/providers/:id/disable`, `GET /admin/jobs`, `GET /admin/audit-logs`

---

## Phased Delivery Roadmap

- **Phase 1: Foundation, Authentication & Layout Shell** — Scaffolding, MongoDB connection, JWT auth, SMTP notifications, Next.js app shell & auth pages.
- **Phase 2: BYOK Provider Engine & Catalog** — Provider catalog models, AES-256-GCM credential encryption, key testing, UI for providers & key settings.
- **Phase 3: Video Projects & Script Planner Engine** — Video project state machine, LLM-based JSON scene decomposition, project wizard, and interactive scene prompt editor.
- **Phase 4: Video Generation Worker & Provider Adapters** — Provider adapter contract, Alibaba Wan adapter, mock test adapter, in-process queue, video download/ffprobe validation, and private S3 upload.
- **Phase 5: FFmpeg Rendering & Media Assembly** — Video normalization, clip concatenation, narration/music mixing, subtitle burn-in, poster thumbnails, and expiring S3 presigned downloads.
- **Phase 6: Usage Tracking, Limits & Admin Console** — Detailed usage auditing, user limit enforcement, strict free-only guard, admin control panel with killswitches, and full E2E regression tests.

---

<!-- AUTO:BEGIN task-board -->
> Generated by `.ai/scripts/status-manager.js` from `.ai/memory/state.json`. Do not edit by hand — use the CLI.

## Task Board

### PHASE-01: Foundation, Authentication & Layout Shell (Status: COMPLETED)
- **[COMPLETED]** PHASE-01-BE-001: Core Setup, MongoDB Connection & Health Checks (Agent: backend-agent, Priority: P0, Complexity: M)
  * Criteria: NestJS app initializes with ConfigModule, Mongoose connects to MongoDB, /health/live and /health/ready return 200 OK, Winston logging redacts sensitive tokens.
- **[COMPLETED]** PHASE-01-BE-002: User Management & JWT Authentication Module (Agent: backend-agent, Priority: P0, Complexity: L)
  * Depends on: PHASE-01-BE-001
  * Criteria: POST /api/v1/auth/register hashes passwords with bcrypt; POST /api/v1/auth/login returns access (15m) and rotating refresh (7d) JWT tokens; POST /api/v1/auth/logout invalidates session; GET /api/v1/auth/me returns user profile; Nodemailer sends verification and reset emails.
- **[COMPLETED]** PHASE-01-FE-001: Next.js App Shell, Navigation & Theme System (Agent: frontend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-01-BE-001
  * Criteria: Tailwind CSS and Shadcn UI setup with dark/light theme toggle; responsive desktop sidebar with mobile drawer; Zustand auth store with token persistence; Axios client with automatic refresh-token interceptor.
- **[COMPLETED]** PHASE-01-FE-002: Authentication & User Profile Pages (Agent: frontend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-01-BE-002, PHASE-01-FE-001
  * Criteria: Pages for /register, /login, /forgot-password, /reset-password, /verify-email, and /settings/profile with React Hook Form + Zod validation, error banners, and loading spinners.
- **[COMPLETED]** PHASE-01-QA-001: Foundation & Auth Test Suite (Agent: qa-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-01-BE-002, PHASE-01-FE-002
  * Criteria: Unit tests for AuthService and JwtStrategy pass; integration tests for /api/v1/auth/* endpoints pass; Playwright E2E tests for registration, login, and auth guard redirects pass with >= 80% coverage.
- **[COMPLETED]** PHASE-01-CR-001: Phase 1 Security & Architecture Review (Agent: code-review-agent, Priority: P0, Complexity: S)
  * Depends on: PHASE-01-QA-001
  * Criteria: Code Review passes with status APPROVED and 0 CRITICAL or HIGH findings across JWT security, password hashing, MongoDB query sanitization, and CORS/Helmet configurations.

### PHASE-02: BYOK Provider Engine & Catalog (Status: IN_PROGRESS)
- **[COMPLETED]** PHASE-02-BE-001: Provider Catalog & Models Module (Agent: backend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-01-BE-002
  * Criteria: Mongoose schemas for provider_catalog and provider_models with indexes; GET /api/v1/providers and GET /api/v1/providers/:id/models return dynamic catalogue; admin endpoints allow adding/updating model metadata and freeQuotaPolicy.
- **[COMPLETED]** PHASE-02-BE-002: User Provider Connections & Credential Encryption (Agent: backend-agent, Priority: P0, Complexity: L)
  * Depends on: PHASE-02-BE-001
  * Criteria: User provider credentials encrypted at rest with AES-256-GCM (ciphertext, iv, authTag, keyVersion); CRUD for /api/v1/provider-connections with tenant isolation; POST /api/v1/provider-connections/:id/test tests connection without returning raw keys; credentials never exposed in logs or API responses.
- **[COMPLETED]** PHASE-02-FE-001: Provider Catalog Explorer & Model View (Agent: frontend-agent, Priority: P1, Complexity: M)
  * Depends on: PHASE-02-BE-001
  * Criteria: Providers page (/providers) displays provider cards with capabilities, supported aspect ratios/resolutions, duration limits, and billing badge (free_verified, trial, paid, unknown).
- **[COMPLETED]** PHASE-02-FE-002: User API Keys Management & Testing Interface (Agent: frontend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-02-BE-002, PHASE-02-FE-001
  * Criteria: Settings → API Providers (/settings/providers) allows connecting keys with masked display (sk-****abcd); connection test button with status badges; region and custom label configuration; strict free-only toggle.
- **[COMPLETED]** PHASE-02-QA-001: Provider Catalog & Encryption Test Suite (Agent: qa-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-02-BE-002, PHASE-02-FE-002
  * Criteria: Unit tests verify AES-256-GCM encryption, decryption, and key masking; integration tests verify tenant isolation on provider connections; Playwright E2E verifies adding and testing an API key.
- **[PENDING]** PHASE-02-CR-001: Phase 2 BYOK Security Review (Agent: code-review-agent, Priority: P0, Complexity: S)
  * Depends on: PHASE-02-QA-001
  * Criteria: Code Review passes with status APPROVED and 0 CRITICAL or HIGH findings; confirms plaintext API keys are never returned to client, never logged, and properly isolated per tenant.

### PHASE-03: Video Projects & Script Planner Engine (Status: PENDING)
- **[PENDING]** PHASE-03-BE-001: Video Projects & Scenes Data Module (Agent: backend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-02-BE-002
  * Criteria: video_projects and video_scenes Mongoose schemas; project status state machine (draft, script_generating, awaiting_approval, queued, generating, rendering, completed, failed); CRUD endpoints /api/v1/projects with user ownership enforcement.
- **[PENDING]** PHASE-03-BE-002: LLM Script & Scene Generation Engine (Agent: backend-agent, Priority: P0, Complexity: L)
  * Depends on: PHASE-03-BE-001
  * Criteria: POST /api/v1/projects/:id/script/generate parses user prompt into structured JSON scenes (narration, visualPrompt, plannedDurationSeconds, transition); respects provider duration boundaries; PATCH /projects/:id/script allows editing; POST /projects/:id/script/approve locks scene plan.
- **[PENDING]** PHASE-03-FE-001: Video Creation Wizard (Agent: frontend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-03-BE-001
  * Criteria: Multi-step video creation wizard at /videos/new: prompt input, target duration (30/60/90/120s), aspect ratio (9:16, 16:9, 1:1), style, provider/model selector, pre-generation warnings for paid/unknown providers.
- **[PENDING]** PHASE-03-FE-002: Script Review & Scene Prompt Editor (Agent: frontend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-03-BE-002, PHASE-03-FE-001
  * Criteria: Scene review screen (/videos/:id/edit-script): reorder scenes, edit visual and narration prompts, add/delete scenes, preview calculated duration, and approve script button.
- **[PENDING]** PHASE-03-QA-001: Project & Script Planner Test Suite (Agent: qa-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-03-BE-002, PHASE-03-FE-002
  * Criteria: Unit tests for script parser JSON schema validation; integration tests for project CRUD and state transitions; Playwright E2E for video creation wizard and script approval flow.
- **[PENDING]** PHASE-03-CR-001: Phase 3 Script & State Machine Review (Agent: code-review-agent, Priority: P0, Complexity: S)
  * Depends on: PHASE-03-QA-001
  * Criteria: Code Review passes with status APPROVED and 0 CRITICAL or HIGH findings; confirms strict validation on script output and atomic state transitions preventing duplicate generation.

### PHASE-04: Video Generation Worker & Provider Adapters (Status: PENDING)
- **[PENDING]** PHASE-04-BE-001: Provider Adapter Framework & Video Provider Integrations (Agent: backend-agent, Priority: P0, Complexity: XL)
  * Depends on: PHASE-03-BE-002
  * Criteria: TypeScript VideoProviderAdapter interface; Alibaba Cloud Model Studio (Wan) adapter implementing validateCredentials, generateVideo, and getGenerationStatus; MockVideoProvider for local/CI automated testing without real API spend; normalized provider errors.
- **[PENDING]** PHASE-04-BE-002: In-Process Generation Queue & S3 Asset Ingestion (Agent: backend-agent, Priority: P0, Complexity: L)
  * Depends on: PHASE-04-BE-001
  * Criteria: Asynchronous in-process scene queue with concurrency limits; polling processor with exponential backoff; safe HTTP download of provider clips with SSRF prevention; ffprobe stream and duration validation; Amazon S3 upload with tenant-scoped keys; media_assets records.
- **[PENDING]** PHASE-04-FE-001: Real-Time Generation Progress Dashboard (Agent: frontend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-04-BE-002
  * Criteria: Project details screen (/videos/:id) showing generation progress bar, per-scene status badges (queued, generating, downloading, stored, failed), cancel project button, and retry failed scenes action.
- **[PENDING]** PHASE-04-FE-002: Scene Clip Preview & Asset Inspector (Agent: frontend-agent, Priority: P1, Complexity: M)
  * Depends on: PHASE-04-BE-002, PHASE-04-FE-001
  * Criteria: Preview individual generated scene video clips; display clip metadata (codec, resolution, duration); single-scene regenerate modal with prompt tweak.
- **[PENDING]** PHASE-04-QA-001: Video Generation & Adapter Test Suite (Agent: qa-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-04-BE-002, PHASE-04-FE-002
  * Criteria: Unit tests for Wan adapter request/response normalization; integration tests for generation worker with mock adapter and S3 upload mocking; Playwright E2E testing progress polling and scene status updates.
- **[PENDING]** PHASE-04-CR-001: Phase 4 Generation Pipeline & S3 Security Review (Agent: code-review-agent, Priority: P0, Complexity: S)
  * Depends on: PHASE-04-QA-001
  * Criteria: Code Review passes with status APPROVED and 0 CRITICAL or HIGH findings; confirms SSRF protection on video downloads, no silent paid fallback, and secure S3 tenant key isolation.

### PHASE-05: FFmpeg Rendering & Media Assembly (Status: PENDING)
- **[PENDING]** PHASE-05-BE-001: FFmpeg Video Concatenation & Audio Mixing Engine (Agent: backend-agent, Priority: P0, Complexity: L)
  * Depends on: PHASE-04-BE-002
  * Criteria: Service invoking FFmpeg to normalize scene clips (H.264/AAC, target aspect ratio/fps), concatenate in sequence, mix voiceover narration and background music track, burn captions from SRT, and export final MP4.
- **[PENDING]** PHASE-05-BE-002: Thumbnail Generation & Presigned S3 Delivery API (Agent: backend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-05-BE-001
  * Criteria: Extract poster thumbnail from real video frame via FFmpeg; upload final video and thumbnail to S3; generate short-lived presigned GET URLs for preview and download; cleanup temporary render files.
- **[PENDING]** PHASE-05-FE-001: Video Player & Render Progress Interface (Agent: frontend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-05-BE-001
  * Criteria: Finished video player at /videos/:id with custom playback controls, aspect-ratio container (9:16 vertical, 16:9 landscape, 1:1 square), render progress state, and retry render button.
- **[PENDING]** PHASE-05-FE-002: Video Library, Download & Project Actions (Agent: frontend-agent, Priority: P1, Complexity: M)
  * Depends on: PHASE-05-BE-002, PHASE-05-FE-001
  * Criteria: Videos index page (/videos) with grid/table view, filters by status and date, expiring download button, project duplication modal, and delete project with asset confirmation.
- **[PENDING]** PHASE-05-QA-001: Render Engine & Media Delivery Test Suite (Agent: qa-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-05-BE-002, PHASE-05-FE-002
  * Criteria: Unit tests for FFmpeg parameter generation and ffprobe output parsing; integration tests for render lifecycle and presigned URL expiration; Playwright E2E for video playback, download link trigger, and project duplication.
- **[PENDING]** PHASE-05-CR-001: Phase 5 Media Pipeline & Delivery Review (Agent: code-review-agent, Priority: P0, Complexity: S)
  * Depends on: PHASE-05-QA-001
  * Criteria: Code Review passes with status APPROVED and 0 CRITICAL or HIGH findings; confirms command injection defense on FFmpeg calls, temp file descriptor cleanup, and S3 presigned URL expiration enforcement.

### PHASE-06: Usage Tracking, Limits & Admin Console (Status: PENDING)
- **[PENDING]** PHASE-06-BE-001: Provider Usage Tracking & User Limits Enforcement (Agent: backend-agent, Priority: P0, Complexity: L)
  * Depends on: PHASE-05-BE-002
  * Criteria: provider_usage collection logging every provider call with units/duration/cost estimate; middleware/guard enforcing daily/monthly job caps and max estimated cost per project; block paid/unknown providers toggle check.
- **[PENDING]** PHASE-06-BE-002: Platform Administration & System Diagnostics API (Agent: backend-agent, Priority: P0, Complexity: M)
  * Depends on: PHASE-06-BE-001
  * Criteria: Admin endpoints (/api/v1/admin/*) protected by admin RBAC: GET /admin/dashboard, GET /admin/users with suspension toggle, GET/PATCH /admin/providers with emergency killswitch, GET /admin/jobs with failure logs, GET /admin/audit-logs.
- **[PENDING]** PHASE-06-FE-001: Usage Analytics & User Limits Dashboard (Agent: frontend-agent, Priority: P1, Complexity: M)
  * Depends on: PHASE-06-BE-001
  * Criteria: Usage dashboard (/usage) showing consumption charts by provider and model, daily/monthly job limit progress bars, estimated cost breakdown, and personal limit settings at /settings/limits.
- **[PENDING]** PHASE-06-FE-002: Platform Admin Console (Agent: frontend-agent, Priority: P0, Complexity: L)
  * Depends on: PHASE-06-BE-002, PHASE-06-FE-001
  * Criteria: Admin console (/admin): provider catalogue manager with killswitch button, global job monitor with failure diagnostics, user management table with suspend/activate actions, and system audit log viewer.
- **[PENDING]** PHASE-06-QA-001: Usage, Admin & Full System E2E Regression Suite (Agent: qa-agent, Priority: P0, Complexity: L)
  * Depends on: PHASE-06-BE-002, PHASE-06-FE-002
  * Criteria: Unit tests for limit validation and free-only guard; integration tests for admin endpoints and audit logging; comprehensive Playwright E2E suite covering full lifecycle: user signup -> key setup -> project creation -> scene generation -> render -> usage tracking -> admin monitoring.
- **[PENDING]** PHASE-06-CR-001: Phase 6 Final Production & Security Review (Agent: code-review-agent, Priority: P0, Complexity: S)
  * Depends on: PHASE-06-QA-001
  * Criteria: Code Review passes with status APPROVED and 0 CRITICAL or HIGH findings; confirms admin RBAC lockdown, audit logging completeness, Datadog observability integration, and production readiness.

<!-- AUTO:END task-board -->
