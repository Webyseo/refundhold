# RefundHold

RefundHold holds AI-initiated Stripe refunds until a rule or a human approves
them.

## What It Does

RefundHold is a control layer for Stripe refunds initiated, prepared, or
recommended by AI agents. Before a refund can move forward, RefundHold applies
rules, holds risky cases, requests human approval when needed, and records audit
evidence.

The current demo runs in dry-run mode, with no Stripe API calls and no real
money movement.

## Current Demo

The current demo shows a Stripe refund approval workflow:

1. AI support agent proposes a Stripe refund.
2. RefundHold evaluates the refund policy.
3. Small refunds are allowed.
4. Medium refunds require human approval.
5. Large refunds are denied.
6. Approved refunds can be simulated in `dry_run`.
7. Every step is recorded in the audit trail.

## Demo Policy

- < 50 USD: allowed
- 50-500 USD: approval required
- \> 500 USD: denied

## Current Status

- API for AI support agent refund requests
- Dashboard for refund review
- Deterministic policy evaluation
- Human approval flow
- `dry_run` refund execution
- Audit trail
- Smoke tests
- CI
- Demo access gate

## Not An IAM

RefundHold is not IAM, SSO, Auth0, or Okta. It is a control, approval, and
audit layer for AI-initiated Stripe refunds.

## Local Setup

Install dependencies with pnpm:

```bash
pnpm install
```

Create a local environment file:

```bash
cp .env.example .env
```

Start local Postgres with Docker Compose:

```bash
pnpm db:up
```

Apply Prisma migrations:

```bash
pnpm db:migrate
```

Seed the demo organization, AI support agent, Stripe placeholder, API key, and
refund policies:

```bash
pnpm db:seed
```

Run the development server:

```bash
pnpm dev
```

Open RefundHold at `http://localhost:3000`.

Check the health endpoint:

```bash
curl http://localhost:3000/api/health
```

Run TypeScript validation:

```bash
pnpm typecheck
```

Prisma is configured for Postgres. Set `DATABASE_URL` in a local `.env` before
running Prisma commands that need a database connection.

Open the demo dashboard after the app is running:

```text
http://localhost:3000/app
```

The dashboard lists refund requests from Postgres, shows request detail and
audit history, and lets the demo reviewer approve, reject, or execute approved
refunds in `dry_run` mode. This demo does not move real money. It uses
`AUTHRAIL_DEMO_REVIEWER_EMAIL` from `.env`, defaulting to
`demo.reviewer@refundhold.com`.

### Demo Dashboard Access Gate

Local development keeps the dashboard open by default:

```env
AUTHRAIL_DEMO_ACCESS_ENABLED="false"
AUTHRAIL_DEMO_ACCESS_PASSWORD=""
```

For a hosted demo at `refundhold.com`, enable the lightweight dashboard gate:

```env
AUTHRAIL_DEMO_ACCESS_ENABLED="true"
AUTHRAIL_DEMO_ACCESS_PASSWORD="use-a-long-random-demo-password"
```

When enabled, `/app` routes redirect to `/demo-access` until the reviewer enters
the demo password. The gate only protects dashboard pages. It does not protect
`/api/health`, does not change the `Authorization: Bearer <agent_api_key>` flow
for `POST /api/v1/action-requests`, and does not replace production
authentication.

Developer verification scripts are available in `package.json`. They use
demo-only API keys, the configured demo reviewer, and `dry_run` execution. Do
not run them against untrusted environments or real Stripe data.

## Demo Seed

Run the demo seed after applying migrations to a local Postgres database:

```bash
pnpm db:seed
```

The seed creates or updates:

- one demo organization: `authrail-demo`
- one demo admin/reviewer user: `demo.reviewer@refundhold.com`
- one demo AI support agent
- one hashed demo agent API key
- one Stripe test placeholder
- three refund policies:
  - refunds under 50 USD -> `ALLOW`
  - refunds from 50 USD to 500 USD -> `APPROVAL_REQUIRED`
  - refunds over 500 USD -> `DENY`

When the demo API key is created for the first time, the raw key is printed once
for local development. Later seed runs keep the stored hash and do not show the
raw key again.

For reproducible local E2E runs, set `AUTHRAIL_DEMO_AGENT_API_KEY` in `.env`.
When present, the seed updates the stored demo API key hash from that local key
instead of generating a new unknown raw key.

## Hosted Demo Deployment Checklist

For a controlled hosted demo on Dokploy with Postgres:

1. Create the RefundHold Dokploy project and configure its Postgres service.
2. Point the demo domain at the deployment, for example `refundhold.com`.
3. Set `AUTHRAIL_DEMO_ACCESS_ENABLED=true`.
4. Set `AUTHRAIL_DEMO_ACCESS_PASSWORD` to a long random demo password.
5. Set `AUTHRAIL_DEMO_AGENT_API_KEY` to a demo-only key value and keep it out of
   source control.
6. Set `AUTHRAIL_DEMO_REVIEWER_EMAIL`, usually
   `demo.reviewer@refundhold.com` for the seeded demo reviewer.
7. Set `AUTHRAIL_ACTION_REQUEST_BASE_URL` to the hosted app URL.
8. Apply migrations against the hosted database with
   `pnpm prisma migrate deploy`.
9. Run `pnpm db:seed` once against the hosted database to create demo
   organization, agent, Stripe placeholder, API key hash, and refund policies.
10. Open `/app` and verify that the demo access page appears before the
    dashboard.
11. Run smoke scripts only from a trusted local machine configured with the
    hosted demo URL and demo API key.

This checklist is for a controlled demo environment only. It does not provide
production authentication, authorization, or user management. Add real
authentication before exposing RefundHold to untrusted users or production
Stripe data.

## Why Prisma For The Demo

RefundHold needs a clear relational model for refund requests, policy decisions,
approval reviews, dry-run executions, and append-only audit events. Prisma is a
good demo fit because it provides typed schema-driven access, migration tooling,
and a direct path to Postgres without forcing the product into a specific
application architecture too early.

The approval API, dry-run execution API, and minimal dashboard screens are
implemented for the demo. Real Stripe execution is not implemented yet.

## Initial Data Model

The first Prisma schema defines the core demo entities:

- `Organization`: tenant boundary for all records.
- `User`: human reviewer or audit actor inside an organization.
- `Agent` and `AgentApiKey`: AI support agent records and API key metadata used
  to attribute refund requests.
- `Connector`: current internal name for the Stripe execution surface
  placeholder, including a clearly named placeholder for encrypted credentials.
- `Policy`: refund rules that return `ALLOW`, `DENY`, or `APPROVAL_REQUIRED`.
- `ActionRequest`: current internal name for a Stripe refund request with JSON
  resource, parameters, context, request payload, decision, and status.
- `Approval`: human review record for refund requests that require approval.
- `Execution`: dry-run refund execution record with response payload and error
  metadata.
- `AuditEvent`: append-only audit trail event for refund request, policy,
  approval, and execution lifecycle steps.

## How AGENTS.md Guides Future Codex Tasks

`AGENTS.md` is the internal product and engineering contract for future agent
work in this repository. It still contains historical internal naming and should
be updated in a separate internal-positioning pass once the visible RefundHold
copy is accepted.
