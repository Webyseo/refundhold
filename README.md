# AuthRail

AuthRail is an approval firewall and execution-control layer for sensitive
actions performed by AI agents.

It is not IAM, SSO, Auth0, Okta, or a generic identity provider. AuthRail sits
between AI agents and sensitive execution surfaces so proposed actions can be
evaluated, approved when needed, granted for execution, and recorded in an
immutable audit trail.

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

Seed the demo organization, agent, connector, API key, and policies:

```bash
pnpm db:seed
```

Run the development server:

```bash
pnpm dev
```

Open the app at `http://localhost:3000`.

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

The dashboard lists action requests from Postgres, shows request detail and
audit history, and lets the demo reviewer approve, reject, or execute approved
requests in `dry_run` mode. It uses `AUTHRAIL_DEMO_REVIEWER_EMAIL` from `.env`,
defaulting to `reviewer@authrail.local`.

### Demo Dashboard Access Gate

Local development keeps the dashboard open by default:

```env
AUTHRAIL_DEMO_ACCESS_ENABLED="false"
AUTHRAIL_DEMO_ACCESS_PASSWORD=""
```

For a hosted demo, enable the lightweight dashboard gate:

```env
AUTHRAIL_DEMO_ACCESS_ENABLED="true"
AUTHRAIL_DEMO_ACCESS_PASSWORD="use-a-long-random-demo-password"
```

When enabled, `/app` routes redirect to `/demo-access` until the reviewer enters
the demo password. The gate only protects dashboard pages. It does not protect
`/api/health`, does not change the `Authorization: Bearer <agent_api_key>` flow
for `POST /api/v1/action-requests`, and does not replace production
authentication. It is not SSO, IAM, Auth0, Okta, or a user directory.

Run the action request smoke test from a second terminal while the Next.js app
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

Run the execution flow smoke test to verify the complete MVP path:

```bash
pnpm smoke:execution-flow
```

The execution flow smoke test creates a reviewable 100 EUR refund, approves it,
executes it in `dry_run` mode, then verifies a duplicate execution is rejected.

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
- one Stripe test connector placeholder
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
2. Set `AUTHRAIL_DEMO_ACCESS_ENABLED=true`.
3. Set `AUTHRAIL_DEMO_ACCESS_PASSWORD` to a long random demo password.
4. Set `AUTHRAIL_DEMO_AGENT_API_KEY` to a demo-only key value and keep it out of
   source control.
5. Set `AUTHRAIL_DEMO_REVIEWER_EMAIL`, usually `reviewer@authrail.local` for
   the seeded demo reviewer.
6. Set `AUTHRAIL_ACTION_REQUEST_BASE_URL` to the hosted app URL.
7. Apply migrations against the hosted database with
   `pnpm prisma migrate deploy`.
8. Run `pnpm db:seed` once against the hosted database to create demo
   organization, agent, connector, API key hash, and policies.
9. Open `/app` and verify that the demo access page appears before the
   dashboard.
10. Run smoke scripts only from a trusted local machine configured with the
    hosted demo URL and demo API key.

This checklist is for a controlled demo environment only. It does not provide
production authentication, authorization, user management, SSO, or credential
governance. Add real authentication before exposing AuthRail to untrusted users
or production data.

## Why Prisma For The MVP

AuthRail needs a clear relational model for proposed actions, policy decisions,
approval reviews, execution grants, and append-only audit events. Prisma is a
good MVP fit because it provides typed schema-driven access, migration tooling,
and a direct path to Postgres without forcing the product into a specific
application architecture too early.

The approval API, dry-run execution API, and minimal dashboard screens are
implemented for the MVP. Connector runtime behavior and real external execution
are not implemented yet.

## Initial Data Model

The first Prisma schema defines the core AuthRail entities:

- `Organization`: tenant boundary for all AuthRail records.
- `User`: human reviewer or audit actor inside an organization, not an IAM user
  directory replacement.
- `Agent` and `AgentApiKey`: AI-agent identity records and API key metadata used
  to attribute proposed actions.
- `Connector`: external execution surface configuration, including a clearly
  named placeholder for encrypted credentials.
- `Policy`: organization rules that return `ALLOW`, `DENY`, or
  `APPROVAL_REQUIRED`.
- `ActionRequest`: proposed sensitive action with JSON resource, parameters,
  context, request payload, decision, and status.
- `Approval`: human review record for action requests that require approval.
- `Execution`: direct execution or execution-grant record with response payload
  and error metadata.
- `AuditEvent`: append-only audit trail event for proposal, policy, approval,
  grant, and execution lifecycle steps.

## How AGENTS.md Guides Future Codex Tasks

`AGENTS.md` is the product and engineering contract for future agent work in
this repository. Codex tasks should preserve its core thesis: AuthRail is an
approval and execution-control layer for AI agents, not an identity provider.

Before adding features, future tasks should check proposed changes against the
priorities, things to avoid, technical principles, and definition of done in
`AGENTS.md`.
