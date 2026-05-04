# Open-Source Status

RefundHold is preparing for a future open-core release, but this repository is
not ready to publish publicly yet.

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

The current codebase still needs public-release hardening. Public package
naming, environment naming, package boundaries, SDK ergonomics, idempotency,
webhooks, audit export, and production live-money readiness are not final.

## Release Blockers Before Public Publication

- Public package naming still uses the legacy internal package name.
- `REFUNDHOLD_*` aliases need to be fully supported and documented.
- Package split has not happened yet.
- SDK does not exist yet.
- Public idempotency contract is not final.
- Webhook callbacks are not a stable public contract.
- Audit export is not productized.
- Production live-money readiness is not complete.
