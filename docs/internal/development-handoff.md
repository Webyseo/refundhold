# Internal Development Handoff

This document preserves operational notes that used to live in the main README.
It is internal handoff material, not product-facing positioning.

For the older detailed handoff, also see
[`development-handoff-root.md`](development-handoff-root.md).

For controlled pilot evaluation, use the
[`pilot readiness checklist`](pilot-readiness-checklist.md).

## Local setup

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed:demo
pnpm dev
```

The app runs at `http://localhost:3000`. The public demo is at `/demo`, and the
reviewer app is at `/app`.

Useful verification commands:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Demo seed

`pnpm db:seed:demo` creates or updates the demo organization, demo reviewer, AI
support agent, demo API key hash, Stripe test placeholder, refund policies, and
8 curated fake refund requests.

Seeded customer emails must stay under `example.test`. The curated refund set
covers waiting for review, approved, rejected, executed demo simulation, blocked
by policy, Stripe test-mode needs-attention, approved-but-waiting test-mode, and
small allowed-credit cases. The seed is idempotent and its cleanup is scoped to
the demo organization, demo agent, demo connector, and `demo-refund-` seeded
identifiers that are no longer in the curated set.

The demo policy is:

- refunds under 50 USD are allowed
- refunds from 50 USD through 500 USD require human approval
- refunds over 500 USD are blocked

If a raw demo API key is generated, it may be printed once for local
development. Later seed runs keep the stored hash. For reproducible local runs,
set the existing demo agent API key variable in `.env` before seeding.

## Demo access gate

Local development keeps the dashboard open by default. Hosted demos can enable
the lightweight private demo gate with the existing demo access settings in
`.env.example`.

When enabled, `/app` routes redirect to `/demo-access` until the reviewer enters
the demo password. The gate protects dashboard pages only. It does not replace
production authentication and does not protect agent API endpoints.

## Hosted demo checklist

For a controlled hosted demo with Postgres:

1. Create the deployment and Postgres service.
2. Point the demo domain at the deployment.
3. Configure the existing demo access password.
4. Configure the existing demo agent API key.
5. Configure the existing demo reviewer email.
6. Configure the app base URL used by local smoke scripts.
7. Apply migrations with Prisma deploy.
8. Run the demo seed once against the hosted database.
9. Open `/app` and verify that private demo access appears when enabled.
10. Run smoke scripts only from a trusted local machine configured for that
    hosted demo.

This checklist is for a controlled demo environment only. Add production-grade
authentication and operational controls before exposing RefundHold to untrusted
users or production Stripe data.

## Internal implementation notes

The repository still contains historical internal names in package metadata,
environment variable prefixes, Prisma enum names, and some TypeScript types.
Keep public product copy as RefundHold unless a dedicated internal rename pass
is requested.

The core demo model includes organizations, users, AI support agents, agent API
keys, Stripe test placeholders, refund policies, refund request records, approval
reviews, demo execution records, and append-only audit events.

Execution in the demo is a simulation. Stripe test-mode support uses test
objects only. Live refunds are blocked in v1.

## Smoke scripts

Developer verification scripts are available in `package.json`. They use demo
API keys, the configured demo reviewer, and demo execution behavior. Do not run
them against untrusted environments or real Stripe data.
