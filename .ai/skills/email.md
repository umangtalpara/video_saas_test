---
name: "email"
description: "Transactional email in NestJS (SMTP, Resend, SendGrid, Amazon SES, Mailgun): provider abstraction, templates, queued sending, verification and reset links. Use when sending signup, verification, password-reset or notification emails."
---

# Email Skill

Provider comes from `state.stack.mailProvider` (Discovery Q7). Dependencies are added by `scaffold-starter.js`.

## Architecture

- `MailModule` exposes `MailService.send({ to, template, data })`. A `MailProvider` interface has one adapter per vendor (`smtp`, `resend`, `sendgrid`, `ses`, `mailgun`); selection by `MAIL_PROVIDER`/config at module init. Business modules never import the vendor SDK.
- **Always send asynchronously**: services emit an event (`auth.user.registered`) → a queue job (BullMQ when Redis, otherwise `@nestjs/event-emitter` + retry loop) → `MailService`. Request handlers never wait on SMTP/API calls.
- Jobs are idempotent (dedupe key like `welcome:<userId>`) and retried with exponential backoff; permanent failures are logged with the job id, never with the email body or tokens.

## Templates

- Templates live in `src/modules/mail/templates/*.hbs` (Handlebars) or React Email; each has a plain-text twin. Variables are typed (`WelcomeEmailData`).
- Links are built from `APP_URL` (frontend base URL env), never from request headers (prevents host-header injection).
- Required templates: welcome/verify email, password reset, password changed, invite (if multi-user), plus any PRD notification.

## Security

- Verification/reset tokens: random 32 bytes, stored **hashed**, single use, short expiry (reset 1 h, verify 24 h).
- `From` address from `MAIL_FROM`; configure SPF/DKIM/DMARC in the deployment checklist.
- Local development: SMTP provider pointing at Mailpit/MailHog (`SMTP_HOST=localhost`, port 1025), added to docker-compose if Docker was chosen.

## Testing

Unit-test template rendering with sample data; integration-test with the in-memory/`jsonTransport` provider asserting the recipient, subject and link. Never call real providers in tests.
