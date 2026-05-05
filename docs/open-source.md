# Open-Source Status

RefundHold is preparing for a future open-core release, but this repository is
not ready to publish publicly yet.

Use the [public release checklist](public-release-checklist.md) for the future
publication decision.

## What RefundHold Is

RefundHold is an approval inbox for AI-generated Stripe refunds. The public
message is: stop AI agents from refunding Stripe money without approval.

RefundHold evaluates AI-proposed Stripe refunds, applies policy checks, holds
risky refunds for human review, and records an audit trail.

## What The Open-Source Core Is Intended To Include

The future open-source core is expected to include:

- Deterministic refund policy evaluator.
- Public refund-request API contract.
- Demo simulation.
- Local demo UI.
- Fake demo data.
- Public docs.
- Future TypeScript SDK.

These pieces should make it possible to understand and run the approval-control
flow locally without live money movement.

## What Stays Commercial Or Private

The commercial or private boundary is expected to include:

- Hosted multi-tenant cloud operations.
- Production auth and RBAC operations.
- Customer data handling.
- Billing and entitlements.
- Deployment and provisioning scripts.
- Production monitoring.
- Live and test Stripe execution internals until hardened.
- Webhook persistence until the contract is stable.
- Audit export until productized.

## Current Safety Boundary

- Demo simulation does not move money.
- Stripe test-mode uses test objects only.
- Live refunds are blocked in v1.
- The AI agent must not receive Stripe secret keys.
- RefundHold cannot prevent bypass if the AI agent can call Stripe directly.

## What Is Not Ready Yet

The current codebase still needs public-release hardening around package
boundaries, SDK ergonomics, idempotency, webhooks, audit export, Stripe
test-mode adapter boundaries, production self-hosting claims, and live-money
readiness.

## Current Preparation Completed

- Public package metadata now uses RefundHold naming.
- `REFUNDHOLD_*` public env names are supported.
- Release inventory check exists.
- `@refundhold/core` skeleton exists.
- Operational docs are under `docs/internal`.

## Release Blockers Before Public Publication

- Package split is not complete.
- SDK does not exist.
- Public idempotency contract is not final.
- Webhook callbacks are not a stable public contract.
- Audit export is not productized.
- Stripe test-mode adapter boundary is not final.
- Production auth/RBAC posture is not ready for public self-hosting claims.
- Live-money readiness is incomplete.
- Private/commercial files still need a final release inventory review.
- Deployment docs are internal and not a public self-hosting guide.
