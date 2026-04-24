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

## Why Prisma For The MVP

AuthRail needs a clear relational model for proposed actions, policy decisions,
approval reviews, execution grants, and append-only audit events. Prisma is a
good MVP fit because it provides typed schema-driven access, migration tooling,
and a direct path to Postgres without forcing the product into a specific
application architecture too early.

No action-request, policy, authentication, approval, or audit models are
implemented yet.

## How AGENTS.md Guides Future Codex Tasks

`AGENTS.md` is the product and engineering contract for future agent work in
this repository. Codex tasks should preserve its core thesis: AuthRail is an
approval and execution-control layer for AI agents, not an identity provider.

Before adding features, future tasks should check proposed changes against the
priorities, things to avoid, technical principles, and definition of done in
`AGENTS.md`.

