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

## Why Prisma For The MVP

AuthRail needs a clear relational model for proposed actions, policy decisions,
approval reviews, execution grants, and append-only audit events. Prisma is a
good MVP fit because it provides typed schema-driven access, migration tooling,
and a direct path to Postgres without forcing the product into a specific
application architecture too early.

API routes, authentication logic, policy evaluation, approval workflows, and
audit-writing behavior are not implemented yet.

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
