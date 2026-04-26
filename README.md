# RefundHold

Hold AI-initiated Stripe refunds until they are approved.

## What It Does

RefundHold sits between an AI support agent and Stripe. When an agent requests a
refund, RefundHold checks policy, asks for approval when needed, blocks
high-risk refunds, executes safely in `dry_run` mode, and records audit
evidence.

## Current Demo

The current demo shows a Stripe refund approval workflow:

1. AI agent requests a Stripe refund.
2. RefundHold evaluates the refund policy.
3. Small refunds are allowed.
4. Medium refunds require human approval.
5. Large refunds are denied.
6. Approved refunds can be executed in `dry_run`.
7. Every step is recorded in the audit trail.

## Demo Policy

- < 50 EUR: allowed
- 50–500 EUR: approval required
- \> 500 EUR: denied

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

RefundHold is not IAM, SSO, Auth0, or Okta. It is an approval and audit layer
for risky refunds initiated by AI agents.

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
`reviewer@authrail.local`.

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

Run the refund decision smoke test from a second terminal while the Next.js app
is running:

```bash
pnpm smoke:action-request
```

The smoke test calls the real `POST /api/v1/action-requests` endpoint using the
local demo API key from `.env` and verifies the seeded refund policies:

- 25 EUR refund -> `allow`
- 100 EUR refund -> `approval_required`
- 750 EUR refund -> `deny`

The `.env.example` API key is for local development only. The seed hashes it
before storage and the smoke test sends it as `Authorization: Bearer <key>`.

Run the approval flow smoke test to verify the human review endpoints:

```bash
pnpm smoke:approval-flow
```

The approval flow smoke test creates one reviewable 100 EUR refund and approves
it, then creates a second reviewable 100 EUR refund and rejects it. It uses
`AUTHRAIL_DEMO_REVIEWER_EMAIL` from `.env`, defaulting to
`reviewer@authrail.local`.

Run the execution flow smoke test to verify the complete demo path:

```bash
pnpm smoke:execution-flow
```

The execution flow smoke test creates a reviewable 100 EUR refund, approves it,
executes it in `dry_run` mode, then verifies a duplicate execution is rejected.
This demo does not move real money.

## Demo Seed

Run the demo seed after applying migrations to a local Postgres database:

```bash
pnpm db:seed
```

The seed creates or updates:

- one demo organization: `authrail-demo`
- one demo admin/reviewer user: `reviewer@authrail.local`
- one demo AI support agent
- one hashed demo agent API key
- one Stripe test placeholder
- three refund policies:
  - refunds under 50 EUR -> `ALLOW`
  - refunds from 50 EUR to 500 EUR -> `APPROVAL_REQUIRED`
  - refunds over 500 EUR -> `DENY`

When the demo API key is created for the first time, the raw key is printed once
for local development. Later seed runs keep the stored hash and do not show the
raw key again.

For reproducible local E2E runs, set `AUTHRAIL_DEMO_AGENT_API_KEY` in `.env`.
When present, the seed updates the stored demo API key hash from that local key
instead of generating a new unknown raw key.

## Hosted Demo Deployment Checklist

For a controlled hosted demo on Vercel with hosted Postgres:

1. Create a hosted Postgres database and set `DATABASE_URL` for the Vercel
   project.
2. Point the demo domain at the deployment, for example `refundhold.com`.
3. Set `AUTHRAIL_DEMO_ACCESS_ENABLED=true`.
4. Set `AUTHRAIL_DEMO_ACCESS_PASSWORD` to a long random demo password.
5. Set `AUTHRAIL_DEMO_AGENT_API_KEY` to a demo-only key value and keep it out of
   source control.
6. Set `AUTHRAIL_DEMO_REVIEWER_EMAIL`, usually `reviewer@authrail.local` for
   the seeded demo reviewer.
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
