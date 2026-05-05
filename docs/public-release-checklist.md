# Public Release Checklist

RefundHold is not ready for public repository publication yet.

## Ready

- Public product message is clear: stop AI agents from refunding Stripe money
  without approval.
- Public docs avoid legacy naming.
- Governance docs exist.
- Apache-2.0 license exists.
- Local demo guide exists.
- `REFUNDHOLD_*` public env names are supported.
- Smoke scripts use the public refund API.
- `@refundhold/core` skeleton exists.
- Release inventory check exists.
- Operational docs are under `docs/internal`.

## Blockers Before Making The Repo Public

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

## Do Not Claim

- Production live-money readiness.
- Full compliance.
- Fraud prevention.
- Stripe approval or affiliation.
- Do not claim enterprise-grade security.
- Autonomous safe refunds.

## Required Validation Before Publication

```bash
pnpm prisma generate
pnpm prisma validate
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm check:open-source-release
```

## Release Decision

- No-go by default.
- Go only after blockers are resolved and release inventory passes.
- Public publication must be a separate explicit decision, not an accidental
  push.
