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

## Why Prisma For The MVP

AuthRail needs a clear relational model for proposed actions, policy decisions,
approval reviews, execution grants, and append-only audit events. Prisma is a
good MVP fit because it provides typed schema-driven access, migration tooling,
and a direct path to Postgres without forcing the product into a specific
application architecture too early.

Approval workflows, connector runtime behavior, execution runtime behavior, and
dashboard screens are not implemented yet.

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
