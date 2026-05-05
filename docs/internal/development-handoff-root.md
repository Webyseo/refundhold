# RefundHold Development Handoff

Date: 2026-04-27

This document is for the next model or developer continuing the project on
another machine.

## Product Positioning

RefundHold is the correct visible product name. It holds AI-initiated Stripe
refunds until policy and human approval allow them to proceed.

The GitHub repo has been renamed to `Webyseo/refundhold`. The local project
directory, package name, and internal code still contain `authrail` or
`AuthRail` identifiers, `AUTHRAIL_` environment variables, and an
`authrail-demo` seed organization. Treat those as internal historical naming
unless the user asks for a separate internal rename. Do not change the visible
product back to AuthRail.

RefundHold is not IAM, SSO, Auth0, Okta, or a generic identity provider. It is
an approval and execution-control layer for risky refunds initiated by AI
agents.

## Current Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma 7 with PostgreSQL
- Tailwind CSS 4
- Vitest
- pnpm 10.0.0
- Docker Compose for local Postgres

Use Node.js 22, matching `.github/workflows/ci.yml`.

## Current Working Product

- Landing page at `/` describing RefundHold.
- Demo dashboard at `/app`.
- Refund queue at `/app/action-requests`.
- Refund detail/review page at `/app/action-requests/[id]`.
- Lightweight hosted-demo gate at `/demo-access` when enabled by env vars.
- Health endpoint at `GET /api/health`.
- Agent API at `POST /api/v1/action-requests`.
- Review endpoints:
  - `POST /api/v1/action-requests/[id]/approve`
  - `POST /api/v1/action-requests/[id]/reject`
- Dry-run execution endpoint:
  - `POST /api/v1/action-requests/[id]/execute`

The implemented demo flow is:

1. AI support agent sends a Stripe refund request.
2. RefundHold authenticates the agent API key.
3. RefundHold evaluates deterministic refund policies.
4. Decision is `allow`, `deny`, or `approval_required`.
5. Medium refunds require reviewer approval or rejection.
6. Approved reviewable refunds can be executed in `dry_run`.
7. Request, policy, decision, approval, and execution events are written to the
   audit trail.

## Demo Policy

The seed creates these active Stripe test refund policies:

- Amount under 50 EUR: `ALLOW`
- Amount from 50 EUR through 500 EUR: `APPROVAL_REQUIRED`
- Amount over 500 EUR: `DENY`

## Important Files

- `AGENTS.md`: product and engineering contract for future agent work.
- `README.md`: setup, demo flow, smoke scripts, and deployment checklist.
- `.env.example`: local environment template.
- `.github/workflows/ci.yml`: CI verification commands.
- `prisma/schema.prisma`: data model and enums.
- `prisma/seed.ts`: demo organization, reviewer, agent, API key, connector, and
  policy seed.
- `src/lib/policies/evaluator.ts`: deterministic policy evaluator.
- `src/lib/action-requests/handler.ts`: action request intake, auth, policy
  evaluation, fail-closed handling, and audit input construction.
- `src/lib/approvals/handler.ts`: approve/reject logic and review guardrails.
- `src/lib/executions/handler.ts`: dry-run execution guardrails.
- `src/lib/*/prisma-persistence.ts`: database persistence boundaries.
- `src/lib/dashboard/*`: dashboard queries and view-model helpers.
- `src/app/api/v1/**/route.ts`: API route adapters.
- `scripts/smoke-*.ts`: local end-to-end demo smoke scripts.

## Fresh Machine Setup

From the copied project directory:

```bash
corepack enable
corepack prepare pnpm@10.0.0 --activate
pnpm install --frozen-lockfile
cp .env.example .env
pnpm db:up
pnpm prisma:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/app
```

Run smoke scripts from a second terminal while `pnpm dev` is running:

```bash
pnpm smoke:action-request
pnpm smoke:approval-flow
pnpm smoke:execution-flow
```

## Environment Notes

Required local keys are documented in `.env.example`:

- `DATABASE_URL`
- `AUTHRAIL_DEMO_AGENT_API_KEY`
- `AUTHRAIL_DEMO_REVIEWER_EMAIL`
- `AUTHRAIL_ACTION_REQUEST_BASE_URL`
- `AUTHRAIL_DEMO_ACCESS_ENABLED`
- `AUTHRAIL_DEMO_ACCESS_PASSWORD`

`.env` is intentionally ignored by git. If this repo is transported through a
USB handoff, the local `.env` may be copied for convenience, but it must not be
committed or shared publicly.

## Known Constraints And Risks

- Real Stripe execution is not implemented. Execution is currently `dry_run`
  only.
- Execution grants exist in the data model as future-facing concepts, but grant
  issuance is not implemented in the API.
- The demo reviewer identity is a header/env based shortcut, not production
  authentication.
- The hosted demo access gate protects dashboard pages only. It is not a
  production auth system and does not protect agent API endpoints.
- Generated Prisma client output lives under `src/generated/prisma` and is
  ignored by git. Run `pnpm prisma:generate` after dependency install.
- The schema and code still contain AuthRail/internal names. Keep visible copy
  as RefundHold unless explicitly asked to perform a broader rename.
- Action requests that are `ALLOW` are recorded as allowed, but the current
  execution endpoint only executes approved `APPROVAL_REQUIRED` requests in
  `dry_run`. A future direct execution path needs careful policy and audit
  design.

## Recommended Next Development Step

Implement execution grants or real Stripe execution only after preserving these
security properties:

- No sensitive refund execution before policy evaluation.
- `approval_required` refunds cannot execute without approved review or a valid
  grant.
- `deny` refunds cannot execute.
- Every lifecycle step creates an append-only audit event.
- Ambiguous policy, approval, audit, or execution state fails closed.

## Verification Commands

Last local verification during this handoff, on 2026-04-27:

- `pnpm test`: OK, 10 files and 55 tests passed.
- `pnpm typecheck`: OK.
- `pnpm lint`: OK.
- `pnpm prisma validate`: OK.
- `pnpm build`: OK.
- Database-backed smoke scripts were not run during this handoff.

Use the same baseline as CI:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm prisma validate
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

For local database flow verification:

```bash
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev
pnpm smoke:action-request
pnpm smoke:approval-flow
pnpm smoke:execution-flow
```

## USB Transfer Notes

For moving machines, copy the repository source, `.git`, lockfile, Prisma
migrations, scripts, docs, and local env file if needed. Regenerate or reinstall
these on the destination instead of transporting them:

- `node_modules`
- `.next`
- `src/generated/prisma`
- coverage/build artifacts

The transferred project should be usable after `pnpm install --frozen-lockfile`
and `pnpm prisma:generate`.
