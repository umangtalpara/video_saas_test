---
name: "payments"
description: "Payment gateway integration (Stripe, Razorpay, PayPal) in NestJS: checkout, subscriptions, signed webhooks, idempotency, reconciliation. Use when Discovery Q10 chose a payment provider or the PRD includes billing."
---

# Payments Skill

Applies when `state.stack.paymentProvider` is Stripe, Razorpay or PayPal. If skipped, do not add payment code.

## Architecture

- A `PaymentsModule` wraps the SDK behind an internal `PaymentGateway` interface (`createCheckout`, `createSubscription`, `cancelSubscription`, `refund`, `verifyWebhook`). Business modules depend on the interface, never on the SDK (architecture rule: third-party libs are wrapped).
- Keys only from env: Stripe `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`; Razorpay `RAZORPAY_KEY_ID/SECRET`, `RAZORPAY_WEBHOOK_SECRET`; PayPal `PAYPAL_CLIENT_ID/SECRET`, `PAYPAL_MODE`. Publishable/public keys go to the frontend via `NEXT_PUBLIC_*`.
- Never trust the client for amounts or plan prices — resolve the price server-side from the plan record.

## Data

`Plan`, `Subscription` (status, currentPeriodEnd, providerCustomerId, providerSubscriptionId), `PaymentEvent` (provider event id **unique**, type, payload, processedAt), optional `Invoice`. With multi-tenancy, billing hangs off the **tenant**, not the user.

## Webhooks (source of truth for state)

1. Raw body access: configure Nest `rawBody: true` for the webhook route; verify the signature first (Stripe `constructEvent`, Razorpay `validateWebhookSignature`, PayPal verify API). Reject with 400 on failure.
2. **Idempotency**: insert `PaymentEvent` with the provider event id (unique index); if it already exists return 200 without reprocessing.
3. Do heavy work in a queue job (BullMQ or scheduler) and return 200 fast.
4. Handle at least: payment succeeded/failed, subscription created/updated/cancelled, refund, dispute. Update `Subscription` from events, not from the checkout redirect.

## Flows

- Checkout: backend creates session/order → returns URL/ids → frontend redirects/opens widget → provider webhook activates the subscription → frontend polls `/subscriptions/me`.
- Plan gating: a `SubscriptionGuard` / `@RequiresPlan()` decorator checks active subscription and plan limits.
- Dunning: on failed payment mark `PAST_DUE`, email the owner, grace period, then downgrade.

## Testing

Use provider test mode and recorded webhook fixtures; test duplicate event delivery, invalid signature, out-of-order events, and amount tampering attempts.

## Review checklist

- [ ] Signature verified on raw body · [ ] Idempotent processing · [ ] No secrets or card data logged (PCI: never store PAN/CVV) · [ ] Price resolved server-side
