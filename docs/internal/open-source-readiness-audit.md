# RefundHold Open-Source Readiness Audit

Audit date: 2026-05-04

Scope: repository inspection only. This document prepares for a future open-core
or open-source release and intentionally does not change product behavior,
routes, database tables, environment variable compatibility, Stripe behavior, or
deployment settings.

Primary public message to preserve:

> Stop AI agents from refunding Stripe money without approval.

Current release posture: not ready to publish as a public GitHub repository.
The strongest open-source candidates are the deterministic refund policy
evaluator, public refund-request API contract, demo simulation, local demo UI,
safe test data, and public docs. The highest-risk areas to keep private or
harden first are hosted deployment/auth operations, live/test Stripe execution
internals, webhook persistence, customer data handling, provisioning scripts,
and legacy naming compatibility surfaces.

## 1. Current Repository Structure

### Top-level project

- `package.json` - Next.js/TypeScript app package. The package is still named
  `authrail`, is marked `"private": true`, and exposes scripts for dev, build,
  test, typecheck, Prisma, smoke tests, auth provisioning, and manual Stripe
  test-mode E2E (`package.json:2-22`).
- `pnpm-lock.yaml` - dependency lockfile.
- `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`,
  `postcss.config.mjs`, `vitest.config.mts` - framework, TypeScript, lint,
  CSS, and test configuration.
- `.github/workflows/ci.yml` - CI installs dependencies, generates Prisma,
  validates schema, runs tests, typecheck, lint, and build.
- `.gitignore` - ignores `.env*`, build output, `.next`, generated Prisma, and
  TypeScript build info, but only explicitly unignores `.env.example`
  (`.gitignore:33-44`). `.env.dokploy.example` is tracked today despite that
  ignore pattern.
- `.dockerignore` - excludes `.env`, `.env.*`, local build artifacts, Git data,
  and generated Prisma from Docker build context while allowing `.env.example`
  and `.env.dokploy.example`.

### Frontend and public product pages

- `src/app/page.tsx` - public landing page with the current core headline:
  "Stop AI agents from refunding Stripe money without approval."
- `src/app/demo/page.tsx` - interactive public demo. It states demo simulation,
  no Stripe call, no real money, and live refunds blocked.
- `src/app/demo/reviewer/page.tsx` - read-only reviewer dashboard demo using
  fictitious sample data and `example.test` customer emails.
- `src/app/docs/*/page.tsx` - public docs pages:
  - `src/app/docs/page.tsx`
  - `src/app/docs/quickstart/page.tsx`
  - `src/app/docs/api/page.tsx`
  - `src/app/docs/test-mode-runbook/page.tsx`
  - `src/app/docs/test-mode-pilot/page.tsx`
  - `src/app/docs/stripe-test-mode/page.tsx`
  - `src/app/docs/prevent-bypass/page.tsx`
  - `src/app/docs/pilot-acceptance/page.tsx`
- `src/app/security/page.tsx` - public security/safety page. It explicitly says
  live refunds are blocked in v1 and that RefundHold is not IAM/SSO or a
  complete compliance platform.
- `src/app/privacy/page.tsx`, `src/app/terms/page.tsx`,
  `src/app/contact/page.tsx` - public legal/contact surfaces.
- `src/app/public-header.tsx`, `src/components/JsonLd.tsx`,
  `src/components/google-analytics.tsx`, `src/lib/seo.ts` - shared public page
  metadata, navigation, analytics, and JSON-LD components.

### Private app/dashboard UI

- `src/app/app/page.tsx` - private app dashboard.
- `src/app/app/refund-requests/page.tsx` and
  `src/app/app/refund-requests/[id]/page.tsx` - public-name aliases for the
  refund queue and detail page.
- `src/app/app/action-requests/page.tsx` and
  `src/app/app/action-requests/[id]/page.tsx` - legacy internal route
  implementation reused by the refund request aliases.
- `src/app/app/action-requests/action-request-controls.tsx` - approve, reject,
  and execute controls.
- `src/app/app/actions.ts` - server actions for dashboard approve/reject/execute
  and route revalidation. It still revalidates legacy `/app/action-requests`
  paths and reads `AUTHRAIL_DEMO_REVIEWER_EMAIL`.
- `src/app/app/onboarding/page.tsx`, `src/app/app/stripe/page.tsx`,
  `src/app/app/feedback/page.tsx`, `src/app/demo-access/page.tsx`,
  `src/app/login/page.tsx` - private demo/app scaffolding, Stripe status,
  feedback, demo access, and login scaffolding.

### API routes

- Preferred public API:
  - `src/app/api/v1/refund-requests/route.ts`
  - `src/app/api/v1/refund-requests/[id]/approve/route.ts`
  - `src/app/api/v1/refund-requests/[id]/reject/route.ts`
  - `src/app/api/v1/refund-requests/[id]/execute/route.ts`
  - `src/app/api/v1/refund-requests/refund-response.ts`
- Legacy compatibility API:
  - `src/app/api/v1/action-requests/route.ts`
  - `src/app/api/v1/action-requests/[id]/approve/route.ts`
  - `src/app/api/v1/action-requests/[id]/reject/route.ts`
  - `src/app/api/v1/action-requests/[id]/execute/route.ts`
  - `src/app/api/v1/action-requests/create-action-request-response.ts`
- Operational/API support:
  - `src/app/api/health/route.ts`
  - `src/app/api/auth/[...all]/route.ts`
  - `src/app/api/webhooks/stripe/route.ts`
  - `src/app/api/activation-events/route.ts`

### Domain logic

- `src/lib/policies/evaluator.ts` - deterministic policy evaluation for
  `allow`, `deny`, and `approval_required`.
- `src/lib/action-requests/handler.ts` - agent API key validation, request
  intake, Stripe test proposal reflection, policy evaluation, and audit input
  assembly.
- `src/lib/approvals/handler.ts` - reviewer authorization, approval/rejection
  validation, reviewability checks, and approval audit metadata.
- `src/lib/executions/handler.ts` - demo execution recording and checks that
  denied/rejected/unapproved requests cannot execute.
- `src/lib/dashboard/view-model.ts` - reviewer-facing display model that maps
  internal states to RefundHold-facing labels and hides `dry_run`.
- `src/lib/dashboard/data.ts` - Prisma dashboard data access.
- `src/lib/security/api-keys.ts` - demo agent key generation, hashing, prefix
  extraction, and legacy env fallback.
- `src/lib/auth/*` - Better Auth/RBAC/session/demo-actor scaffolding.
- `src/lib/db/prisma.ts` - Prisma client adapter and TypeScript record types.

### Stripe areas

- `src/lib/stripe/config.ts` - Stripe safety config. It rejects
  `AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED=true`, rejects live key prefixes, and
  requires server-side test keys only when test mode is enabled
  (`src/lib/stripe/config.ts:57-85`, `src/lib/stripe/config.ts:117-131`).
- `src/lib/stripe/client.ts` - server-side Stripe test client creation.
- `src/lib/stripe/snapshots.ts` - safe Stripe payment/refund snapshots and
  `livemode` rejection (`src/lib/stripe/snapshots.ts:36-51`,
  `src/lib/stripe/snapshots.ts:93-128`).
- `src/lib/stripe/payment-reflection.ts` - Stripe test payment object
  reflection for refund proposals.
- `src/lib/stripe/refund-execution.ts` - controlled Stripe test-mode refund
  execution. It requires test refunds enabled, approved review state, a test
  payment object, `livemode=false`, and an approval record
  (`src/lib/stripe/refund-execution.ts:354-387`,
  `src/lib/stripe/refund-execution.ts:389-560`).
- `src/lib/stripe/webhook-route.ts`, `src/lib/stripe/webhooks.ts`,
  `src/lib/stripe/webhook-persistence.ts` - Stripe test webhook verification,
  safe payload persistence, and refund reconciliation. Live webhooks are
  ignored.
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook route.

### Demo, seed, tests, and scripts

- `prisma/seed-demo.ts` - curated fake demo refund requests, demo policies,
  fake Stripe test identifiers, `example.test` customer emails, and safe
  seeded audit evidence.
- `prisma/seed.ts` - older/smaller demo seed.
- `prisma/seed-demo.test.ts` and `prisma/seed-demo.ts` - test and data source
  for local demo fixtures.
- `scripts/smoke-action-request.ts`, `scripts/smoke-approval-flow.ts`,
  `scripts/smoke-execution-flow.ts` - local smoke tests using the legacy
  action-request API shape.
- `scripts/stripe-test-e2e.ts` - manual Stripe test-mode E2E, explicitly
  blocked in normal CI unless opted in and blocked against production
  RefundHold URLs.
- `scripts/provision-auth-user.ts` - manual auth provisioning for controlled
  environments.
- `*.test.ts` and `*.test.tsx` under `src`, `scripts`, and `prisma` - unit and
  page tests. Several tests assert that public pages do not expose `AuthRail`,
  `ActionRequest`, `AUTHRAIL_`, `connector`, `dry_run`, or
  "production-ready live refunds".

### Database and migrations

- `prisma/schema.prisma` - current schema. It still contains the internal
  `ActionRequest`, `Connector`, `AuthRailDecision`, `ExecutionMode.DRY_RUN`,
  auth/RBAC, Stripe payment/refund/webhook models, and append-only audit event
  model.
- `prisma/migrations/*` - historical migrations. Several migration names and
  SQL identifiers preserve `authrail`, `AuthRailDecision`, `action_requests`,
  and `dry_run`; these should not be renamed before a separate database
  migration compatibility plan.

### Docs and deployment

- Public-facing root docs: `README.md`.
- Internal/operational docs:
  - `docs/DEVELOPMENT_HANDOFF.md`
  - `docs/internal/development-handoff.md`
  - `docs/internal/demo-simulation-pilot-test-kit.md`
  - `docs/internal/pilot-readiness-checklist.md`
  - `docs/internal/pilot-rehearsal-report.md`
  - `AUTH_ACTIVATION_RUNBOOK.md`
  - `README_DEPLOY_DOKPLOY.md`
  - `STRIPE_TEST_MODE_E2E.md`
  - `BACKUP_RESTORE.md`
- Deployment files:
  - `Dockerfile`
  - `docker-compose.yml`
  - `docker-compose.dokploy.yml`
  - `.env.example`
  - `.env.dokploy.example`

## 2. Public-Safe Components

These are reasonable candidates for an open-source release after naming cleanup
and packaging. "Public-safe" here means the component is compatible with the
RefundHold thesis and does not appear to require commercial cloud secrets or
hosted customer operations.

### Core policy and domain contracts

- `src/lib/policies/evaluator.ts`
  - Deterministic, explainable rule matching.
  - Explicit decisions: `allow`, `deny`, `approval_required`.
  - Default-deny behavior when no policy matches.
  - Candidate package: `refundhold-core`.
- `src/lib/policies/evaluator.test.ts`
  - Focused tests for rules and precedence.
  - Candidate package: `refundhold-core`.
- Public decision mapping in `src/app/api/v1/refund-requests/route.ts`
  - Public shortcut maps demo refund requests into the internal compatibility
    shape while returning `refund_request_id`, `allowed`, `needs_review`, and
    `blocked` (`src/app/api/v1/refund-requests/route.ts:34-94`).
  - Candidate package: `refundhold-api`, after extracting compatibility naming
    behind internal adapters.
- `src/app/api/v1/refund-requests/refund-response.ts`
  - Public alias response mapper; it replaces internal "action request" and
    "Dry-run" messages with "refund request" and "Demo execution recorded."
  - Candidate package: `refundhold-api`.

### Demo simulation and local UI

- `src/app/demo/page.tsx`
  - Fully local, client-side public demo that states no Stripe call and no real
    money movement.
  - Candidate package: `refundhold-demo-app`.
- `src/app/demo/reviewer/page.tsx`
  - Read-only reviewer dashboard with fake `example.test` customers and no DB
    read.
  - Candidate package: `refundhold-demo-app`.
- `src/app/app/refund-requests/page.tsx` and
  `src/app/app/refund-requests/[id]/page.tsx`
  - Public-name aliases for the real queue/detail experience.
  - Candidate package: `refundhold-demo-app`, only after removing direct legacy
    route dependence from public file paths or hiding it inside internal
    adapters.
- `src/lib/dashboard/view-model.ts`
  - Useful public demo display model. It converts internal `dry_run` and live
    Stripe indicators to RefundHold-safe labels, and identifies live records as
    "Live refunds blocked."
  - Candidate package: `refundhold-demo-app` or `refundhold-core` display
    helpers.

### Test data and examples

- `prisma/seed-demo.ts`
  - Strong candidate after replacing `dry_run` naming in policy/connector names
    and keeping all customer emails under `example.test`.
  - Should be public only as local demo seed data, not as hosted production
    seed data.
- `prisma/seed-demo.test.ts`
  - Candidate with demo package.
- `scripts/smoke-action-request.ts`, `scripts/smoke-approval-flow.ts`,
  `scripts/smoke-execution-flow.ts`
  - Candidate examples after switching from `/api/v1/action-requests` and
    `dry_run` to `/api/v1/refund-requests` and `demo_simulation`.
- Public docs pages in `src/app/docs/*`
  - Good product fit. They repeatedly separate demo simulation, Stripe
    test-mode, and blocked live refunds.
  - Must remove the public compatibility endpoint mention before publication
    (`src/app/docs/quickstart/page.tsx:214-221`).
- `README.md`
  - Mostly public-safe. Must remove or move `AUTHRAIL_DEMO_AGENT_API_KEY` and
    `/api/v1/action-requests` compatibility copy before release
    (`README.md:45-60`).

### Safety tests worth publishing

- `src/app/page.test.tsx`, `src/app/demo/page.test.tsx`,
  `src/app/demo/reviewer/page.test.tsx`,
  `src/app/docs/prevent-bypass/page.test.tsx`,
  `src/app/docs/test-mode-runbook/page.test.tsx`,
  `src/app/docs/stripe-test-mode/page.test.tsx`,
  `src/app/app/action-requests/[id]/page.test.tsx`
  - These assert product-safe copy and hidden legacy terms.
- `src/lib/stripe/config.test.ts`, `src/lib/stripe/snapshots.test.ts`,
  `src/lib/stripe/payment-reflection.test.ts`,
  `src/lib/stripe/refund-execution.test.ts`,
  `scripts/stripe-test-e2e.test.ts`
  - These assert live key/live refund blocking and safe redaction. Publish only
    if the corresponding Stripe package remains in the open source tree, or
    move them into a private Stripe test package.

## 3. Private/Proprietary Components

These should stay private in a commercial cloud version, or be heavily
abstracted before any public release.

### Billing and commercial cloud operations

- No billing implementation is visible in this repo today. Before open core,
  keep any future billing, pricing, entitlements, customer management, hosted
  account provisioning, and license enforcement outside the public packages.
- If Stripe Billing or marketplace billing is added later, keep it out of
  `refundhold-core`, `refundhold-demo-app`, and public docs examples.

### Multi-tenant hosted operations and auth

- `src/lib/auth/*`
  - Better Auth/RBAC/session/demo fallback scaffolding is product-specific and
    not yet mature enough for public reuse.
  - Keep private or publish only a minimal auth interface in `refundhold-api`.
- `src/app/api/auth/[...all]/route.ts`, `src/app/login/page.tsx`,
  `src/app/app/layout.tsx`, `src/app/app/app-header.tsx`,
  `src/app/app/session-sign-out-button.tsx`
  - Hosted app auth/session UX; keep private until open-core self-hosting auth
    posture is explicitly supported.
- `scripts/provision-auth-user.ts` and
  `AUTH_ACTIVATION_RUNBOOK.md`
  - Manual operator provisioning and staged auth activation should remain
    private operational docs/scripts.
- `src/lib/auth/app-access.ts`, `src/proxy.ts`
  - Hosted/demo gate access control. Public release can keep a simpler local
    demo access mode, but commercial session/RBAC behavior should remain
    private until stabilized.

### Deployment, secrets, and production operations

- `README_DEPLOY_DOKPLOY.md`, `docker-compose.dokploy.yml`,
  `.env.dokploy.example`, `AUTH_ACTIVATION_RUNBOOK.md`,
  `BACKUP_RESTORE.md`
  - These are commercial/hosted deployment materials, include production domain
    assumptions, and expose internal operational decisions. Keep private or
    replace with a generic self-hosting guide.
- `Dockerfile`
  - Can be public as a generic local/self-host image, but Dokploy-specific
    startup, migration behavior, and commercial environment assumptions should
    be split from open-source packaging.
- `.github/workflows/ci.yml`
  - Safe as public CI, but add license/security scanning and remove private
    deployment assumptions before publication.

### Production Stripe handling and live-money paths

- `src/lib/stripe/refund-execution.ts`
  - It is currently test-mode only and fails closed, but it is still an
    unstable money-movement path. Keep private or isolate as an experimental
    `refundhold-stripe-test` adapter until public API boundaries are stable.
- `src/lib/stripe/payment-reflection.ts`
  - Can be public as a test-mode adapter only if docs make clear it is not live
    execution and requires test keys. Otherwise keep private.
- `src/lib/stripe/client.ts`, `src/lib/stripe/config.ts`
  - Public-safe only if exported as test-mode-only safety utilities. Otherwise
    keep private.
- `src/lib/stripe/webhook-route.ts`, `src/lib/stripe/webhooks.ts`,
  `src/lib/stripe/webhook-persistence.ts`,
  `src/app/api/webhooks/stripe/route.ts`
  - Keep private until webhook event contracts, idempotency, and audit export
    are stable.
- `scripts/stripe-test-e2e.ts`, `STRIPE_TEST_MODE_E2E.md`
  - Keep private or mark as an advanced manual test-mode-only adapter. It
    depends on live Stripe test credentials and operational discipline.

### Customer data handling and monitoring

- `src/lib/dashboard/data.ts`
  - Reads organization-scoped operational data. Public demo should use seeded
    fake data or an adapter interface; hosted data access should stay private.
- `src/lib/activation-events.ts`,
  `src/app/api/activation-events/route.ts`,
  `src/app/activation-event-client.tsx`,
  `src/components/google-analytics.tsx`
  - Internal activation/analytics instrumentation should stay private or be
    disabled by default in open-source release.
- `docs/internal/pilot-rehearsal-report.md`
  - Internal tester/rehearsal findings should remain private.

### Database schema and migrations

- `prisma/schema.prisma` and `prisma/migrations/*`
  - The schema is understandable, but it preserves legacy table/model names and
    early auth/Stripe models. Do not rename database tables before a dedicated
    compatibility plan. For open core, publish a new normalized schema package
    or a documented compatibility schema with clear deprecation notes.

## 4. Naming Risks

Search scope: tracked repository files plus current working copy, excluding
`node_modules`, `.next`, and test files unless noted. Generated Prisma output is
ignored by Git and should not be published.

Summary counts in non-test, non-generated source/docs:

| Term | Count | Main locations | Classification |
| --- | ---: | --- | --- |
| `AuthRail` | 56 | Prisma enum/types, internal TypeScript types, migrations, internal docs | Safe internal legacy for schema/type compatibility; rename before publication only in generated public docs or exported type names |
| `authrail` | 15 | `package.json`, local DB names, demo cookie/signature names, seed org slug, `.env.example` DB URL | Must remain temporarily for package/db compatibility, but package name and public examples should be renamed before publication |
| `AUTHRAIL_` | 189 | env config, scripts, deployment docs, `.env.example`, `.env.dokploy.example`, root operational docs | Must remain temporarily for compatibility in code, but should be hidden from public docs and replaced by `REFUNDHOLD_` aliases before public release |
| `ActionRequest` | 314 | domain types, legacy routes, Prisma schema/migrations, scripts, route internals | Safe internal legacy in DB/API adapter internals; should be hidden from UI/docs and public SDK |
| `action-requests` | 45 | legacy API routes, legacy app routes, SEO exclude list, scripts, README/quickstart | Compatibility route must remain temporarily; public docs should stop advertising it |
| `dry_run` | 18 | execution internals, seed policy names, scripts, internal docs, UI mapping helpers | Internal legacy execution mode; public surfaces should say `demo_simulation` or "Demo simulation" |
| `connector` | 177 | policy evaluator, Prisma schema, persistence, Stripe adapter internals, dashboard internals | Safe internal adapter term; should be hidden from public UI/docs unless an adapter API is intentionally documented |
| `control layer` | 3 | `AGENTS.md`, `docs/DEVELOPMENT_HANDOFF.md` | Internal positioning phrase; should not be public marketing copy |

### Term-by-term classification

#### `AuthRail`

- Safe internal legacy:
  - `prisma/schema.prisma:55`, `prisma/schema.prisma:353`,
    `prisma/schema.prisma:381` (`AuthRailDecision`)
  - `prisma/migrations/20260424000000_initial_authrail_data_model/migration.sql`
  - `src/lib/db/prisma.ts:287-386` (`AuthRailPrismaClient`,
    `AuthRailPrismaTransactionClient`, `authRailPrisma`)
  - `src/lib/action-requests/handler.ts`, `src/lib/approvals/handler.ts`,
    `src/lib/executions/handler.ts` (`StoredAuthRailDecision`)
- Should be hidden from UI/docs:
  - Current public app/page tests already assert this for key pages.
- Should be renamed before open-source release:
  - Any exported public SDK or package type using `AuthRail`.
  - Public generated documentation if Prisma types are published.
- Must remain temporarily for compatibility:
  - Prisma enum and migration history until a separate database rename plan
    exists.

#### `authrail`

- Safe internal legacy:
  - `docker-compose.yml:7-19` local Postgres defaults and volume name.
  - `prisma/seed.ts:14`, `prisma/seed-demo.ts:15` demo organization slug.
  - `src/lib/demo-access.ts:1-5` demo access cookie/signature internals.
- Should be hidden from UI/docs:
  - `docs/DEVELOPMENT_HANDOFF.md:14-18` is internal and should stay private.
- Should be renamed before open-source release:
  - `package.json:2` package name should become a public name such as
    `refundhold` or workspace package names.
  - `.env.example:1` local database URL can use `refundhold` instead of
    `authrail` once compatibility is intentionally handled.
- Must remain temporarily for compatibility:
  - Existing database names, cookie names, and seed organization slug if current
    environments depend on them.

#### `AUTHRAIL_`

- Safe internal legacy:
  - Server-side env parsing in `src/lib/stripe/config.ts`,
    `src/lib/auth/config.ts`, `src/lib/demo-access.ts`,
    `src/lib/security/api-keys.ts`, and scripts.
- Should be hidden from UI/docs:
  - `README.md:45-47` should not expose the legacy demo key variable in public
    open-source docs.
  - `STRIPE_TEST_MODE_E2E.md`, `AUTH_ACTIVATION_RUNBOOK.md`,
    `README_DEPLOY_DOKPLOY.md`, and `docs/DEVELOPMENT_HANDOFF.md` should stay
    internal or be rewritten before publication.
- Should be renamed before open-source release:
  - `.env.example:5-25` should prefer `REFUNDHOLD_` variables and relegate
    `AUTHRAIL_` names to a private compatibility note.
  - `.env.dokploy.example:5-25` should not be public in current form.
- Must remain temporarily for compatibility:
  - Existing env variable reads and deployment envs until `REFUNDHOLD_` aliases
    are added and migration guidance exists.

#### `ActionRequest`

- Safe internal legacy:
  - Prisma model and migration history.
  - `src/lib/action-requests/*`, `src/lib/approvals/*`,
    `src/lib/executions/*`, `src/lib/dashboard/*`, `src/lib/db/prisma.ts`.
- Should be hidden from UI/docs:
  - Page tests already guard against visible `ActionRequest` in public pages
    and dashboard pages.
  - `STRIPE_TEST_MODE_E2E.md:13` should be internal or renamed before
    publication.
- Should be renamed before open-source release:
  - Public SDK/API types should use `RefundRequest`.
  - Public route docs should use `/api/v1/refund-requests` only.
- Must remain temporarily for compatibility:
  - `src/app/api/v1/action-requests/*` legacy routes and DB model names until
    clients and migrations are intentionally retired.

#### `action-requests`

- Safe internal legacy:
  - Legacy routes under `src/app/api/v1/action-requests/*`.
  - Legacy dashboard implementation under `src/app/app/action-requests/*`,
    which is currently wrapped by `/app/refund-requests`.
- Should be hidden from UI/docs:
  - `README.md:60` advertises the compatibility endpoint.
  - `src/app/docs/quickstart/page.tsx:214-221` advertises the compatibility
    endpoint.
  - `STRIPE_TEST_MODE_E2E.md:114` references `/app/action-requests`.
- Should be renamed before open-source release:
  - Smoke scripts should call `/api/v1/refund-requests`.
  - Public docs should remove compatibility route mentions.
- Must remain temporarily for compatibility:
  - Existing route files and aliases until a deprecation window is defined.

#### `dry_run`

- Safe internal legacy:
  - `src/lib/executions/handler.ts:181-226` stores `DRY_RUN`/`dry_run` for demo
    execution.
  - `src/lib/executions/prisma-persistence.ts` persists execution mode.
  - Migration `20260424111000_add_dry_run_execution_mode`.
- Should be hidden from UI/docs:
  - `src/app/app/action-requests/[id]/page.tsx:493-507` already maps `dry_run`
    to `Demo simulation` / `demo_simulation`.
- Should be renamed before open-source release:
  - `prisma/seed-demo.ts:27`, `prisma/seed-demo.ts:130-177` policy and
    connector names should say demo simulation.
  - `scripts/smoke-execution-flow.ts:36` should expect `demo_simulation` once a
    public API response is adjusted in a later behavior-change PR.
- Must remain temporarily for compatibility:
  - `ExecutionMode.DRY_RUN`, database enum values, and persisted audit metadata
    until a database/data migration plan exists.

#### `connector`

- Safe internal legacy:
  - `src/lib/policies/evaluator.ts:3-22` rules/evaluation request fields.
  - Prisma `Connector` model and persistence.
  - Stripe adapter internals.
- Should be hidden from UI/docs:
  - Public page tests already assert some docs/pages do not display
    `connector`.
- Should be renamed before open-source release:
  - Public SDK/API fields should use `provider`, `stripe_mode`, or a
    Stripe-specific request shape rather than generic `connector`.
- Must remain temporarily for compatibility:
  - Internal policy rules, Prisma schema, and compatibility request body shape.

#### `control layer`

- Safe internal legacy:
  - `AGENTS.md:16`, `AGENTS.md:76`, `docs/DEVELOPMENT_HANDOFF.md:21`.
- Should be hidden from UI/docs:
  - Keep this as internal explanation, not public marketing copy. Public copy
    should keep saying approval inbox / approval boundary for AI-generated
    Stripe refunds.
- Should be renamed before open-source release:
  - Any public docs generated from `docs/DEVELOPMENT_HANDOFF.md`.
- Must remain temporarily for compatibility:
  - None.

## 5. Secret and Safety Risks

### Secret scan observations

- `git ls-files` does not show tracked `.env` or `.env.local`. Both files exist
  locally but are ignored and were not inspected.
- `.gitignore` ignores `.env*` and unignores only `.env.example`
  (`.gitignore:33-35`). `.env.dokploy.example` is tracked today, so either add
  an explicit `!.env.dokploy.example` exception or move it to private/internal
  deployment docs before publication.
- A targeted pattern scan for common real secret formats found no apparent real
  Stripe, Google, GitHub, Slack, AWS, or private-key secrets. Matches were
  synthetic test fixtures such as Stripe unit-test key prefixes and webhook
  fixture strings in:
  - `src/lib/stripe/client.test.ts`
  - `src/lib/stripe/config.test.ts`
  - `src/lib/stripe/refund-execution.test.ts`
  - `src/lib/stripe/webhook-route.test.ts`
  - `src/lib/stripe/webhooks.test.ts`
- `.env.example:1` contains a local-only Postgres URL with `authrail:authrail`.
  This is not a production secret, but it looks credential-like and should be
  changed to a clearer placeholder or documented as local-only before public
  release.
- `.env.example:12`, `.env.example:23`, `.env.example:24` leave
  `BETTER_AUTH_SECRET`, Stripe test secret, and webhook secret empty. This is
  good.
- `.env.dokploy.example:3`, `.env.dokploy.example:5`,
  `.env.dokploy.example:9` use placeholder passwords/keys. They are not real
  secrets, but the hosted deployment file is not suitable for a public release
  because it is commercial/Dokploy-specific and legacy-name-heavy.
- `docker-compose.yml:7-19` uses local Postgres credentials
  `authrail/authrail`. This is safe for local dev only, but should be renamed or
  explicitly labeled local-only before open-source publication.
- `STRIPE_TEST_MODE_E2E.md` uses `...` placeholders for secrets and repeatedly
  says not to commit/paste keys.
- `scripts/stripe-test-e2e.ts` redacts Stripe keys, webhook secrets, and bearer
  tokens and rejects production RefundHold URLs.

### Public docs and live Stripe refunds

Current public docs are directionally safe:

- `README.md:83-85` states demo simulation does not move money, Stripe
  test-mode uses test objects only, and live refunds are blocked in v1.
- `src/app/page.tsx` states demo mode only and no live Stripe money moves.
- `src/app/demo/page.tsx` states no Stripe call, no real money, and live refunds
  blocked.
- `src/app/docs/quickstart/page.tsx` states demo simulation, Stripe test-mode,
  and live refunds are separate; it says never use a live Stripe secret as the
  agent API key.
- `src/app/docs/api/page.tsx` tells agents not to call Stripe directly and
  says live refunds are blocked in v1.
- `src/app/docs/test-mode-runbook/page.tsx` says this is not a production
  live-money guide and that live refunds remain blocked.
- `src/app/docs/prevent-bypass/page.tsx` explicitly says RefundHold cannot
  prevent bypass if an AI agent has live Stripe keys.
- `src/app/security/page.tsx` says live refunds are blocked in v1 and
  RefundHold does not move live Stripe money in this version.

Public-doc issues before publication:

- `README.md:60` and `src/app/docs/quickstart/page.tsx:214-221` publicly
  mention `/api/v1/action-requests`; hide this compatibility endpoint from
  open-source docs.
- Public docs currently include hosted domain examples (`refundhold.com`) and
  private app paths. For open source, make local demo paths the default and move
  hosted/cloud references to a commercial/private section.

### Code-path confirmation: live refunds remain blocked

- Stripe config fails closed if `AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED` is true
  (`src/lib/stripe/config.ts:57-60`).
- Stripe config rejects `sk_live_` and `rk_live_` prefixes for the test secret
  (`src/lib/stripe/config.ts:117-131`).
- Stripe snapshots reject live payment objects and live refund objects
  (`src/lib/stripe/snapshots.ts:36-51`,
  `src/lib/stripe/snapshots.ts:116-128`).
- Stripe test refund execution requires `AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED`
  and uses `getStripeSafetyConfig` before execution
  (`src/lib/stripe/refund-execution.ts:354-387`).
- Stripe execution rejects non-test payment objects and `livemode=true`
  (`src/lib/stripe/refund-execution.ts:437-453`).
- Stripe execution requires an approved action request and approval record
  before Stripe test execution (`src/lib/stripe/refund-execution.ts:529-547`).
- Demo execution rejects denied, rejected, unapproved, and non-approved states
  (`src/lib/executions/handler.ts:248-307`).
- Approval review only applies to `APPROVAL_REQUIRED` requests that are still
  pending review (`src/lib/approvals/handler.ts:323-367`).

Residual risk:

- The route name `execute` exists publicly. Docs clarify demo/test-mode only,
  but open-source packaging should make the default demo execution name and
  behavior unmistakable.
- The compatibility route can accept generic `connector/action/resource`
  payloads. Public docs should steer users only to the refund-specific shortcut
  or SDK.
- The database schema includes `StripeMode.LIVE` and `ExecutionMode.DIRECT`.
  These are dormant/guarded today but should be documented as internal reserved
  states before publication.

## 6. Open-Core Packaging Recommendation

Recommended structure:

```text
packages/
  refundhold-core/
    src/policies/
    src/contracts/
    src/audit/
    src/demo-simulation/
  refundhold-api/
    src/routes/
    src/adapters/
    src/persistence/
  refundhold-demo-app/
    app/
    components/
    seed/
    fixtures/
  refundhold-sdk/
    src/client.ts
    src/types.ts
    examples/
docs/
  open-source.md
  local-demo.md
  api.md
  test-mode.md
```

### `refundhold-core`

Contains product logic that should be open and trustworthy:

- Policy evaluation from `src/lib/policies/evaluator.ts`.
- Public request/decision contracts:
  - `refund_request_id`
  - `allowed`
  - `needs_review`
  - `blocked`
  - `approved`
  - `rejected`
  - `executed`
  - `failed`
- Audit event contract for proposal, policy decision, review, demo execution,
  and test-mode evidence.
- Demo simulation state machine and helpers.
- No Next.js, Prisma, Better Auth, Stripe SDK, analytics, hosted deployment, or
  cloud-specific code.

### `refundhold-api`

Contains a reference self-host/local API:

- Public `/api/v1/refund-requests` create/approve/reject/execute handlers.
- Compatibility adapter that can still map internal `ActionRequest` data to
  public `RefundRequest` responses, but does not expose compatibility routes in
  public docs.
- Minimal persistence interface for proposal, policy result, approval,
  execution record, and audit append.
- Local SQLite/Postgres adapter only if maintainable; otherwise document the
  interface and keep Prisma in the demo app.
- No commercial auth provisioning, Dokploy deployment, live Stripe execution,
  hosted analytics, or customer cloud operations.

### `refundhold-demo-app`

Contains a runnable demo:

- Next.js UI from `src/app/page.tsx`, `src/app/demo/page.tsx`,
  `src/app/demo/reviewer/page.tsx`, `src/app/docs/*`, and public-safe pieces of
  `/app/refund-requests`.
- Demo fixtures from `prisma/seed-demo.ts`, after replacing legacy `dry_run`
  labels and making local-only seed assumptions explicit.
- Local-only `.env.example`, local Docker Postgres, and seed scripts.
- Demo simulation only by default. Stripe test-mode can be linked as an
  advanced optional adapter, not enabled in the default demo.

### `refundhold-sdk`

Contains integration helpers for AI-agent/backend developers:

- Typed client for:
  - `createRefundRequest`
  - `approveRefundRequest`
  - `rejectRefundRequest`
  - `recordDemoExecution`
  - optional `getRefundRequest`
- Public types only: `RefundRequest`, `RefundDecision`, `RefundStatus`,
  `RefundRequestCreateInput`, `RefundRequestResponse`.
- Examples for Node/TypeScript backends and AI-agent tool wrappers.
- No `ActionRequest`, `connector`, `dry_run`, or `AUTHRAIL_` names in public
  SDK exports.

### `docs`

Contains public docs:

- `docs/open-source.md` - what is open-core, what is cloud/private, supported
  safety boundary.
- `docs/local-demo.md` - local setup, demo seed, no live Stripe money.
- `docs/api.md` - public refund request contract only.
- `docs/test-mode.md` - optional controlled Stripe test-mode guide with strong
  warnings.
- Internal handoff, deployment, activation, and rehearsal docs stay private.

## 7. Files to Create Before Publication

- `README.md` improvements
  - Keep the core message and demo setup.
  - Remove public mention of `AUTHRAIL_DEMO_AGENT_API_KEY` and
    `/api/v1/action-requests`.
  - Explain open-core package layout.
  - Put "Live refunds are blocked in v1" near every setup path.
- `LICENSE`
  - Recommendation: Apache-2.0 if the goal is broad commercial adoption and
    permissive use with patent grant.
  - Alternative: AGPL-3.0 only if the business wants network-copyleft leverage
    against closed hosted forks.
  - Do not publish without a deliberate license choice.
- `CONTRIBUTING.md`
  - Local setup, `pnpm` version, Prisma generate, tests, lint, typecheck.
  - Product constraints: no IAM/SSO positioning, no live refunds, no generic
    workflow drift.
- `SECURITY.md`
  - Supported versions, vulnerability disclosure contact, no public secret
    sharing, no live Stripe key use in repros.
- `DISCLAIMER.md`
  - Not legal/financial/tax/accounting advice.
  - Not affiliated with Stripe.
  - Demo/test-mode only; no live-money readiness claim.
- `CODE_OF_CONDUCT.md`
  - Standard Contributor Covenant or a concise project-specific code of
    conduct.
- `docs/open-source.md`
  - Open-core boundary and what remains commercial/cloud-only.
- `docs/local-demo.md`
  - Safe local setup, fake data, local secrets guidance, and validation steps.

## 8. Release Blocker Checklist

### Critical

- [ ] Choose and add a license (`LICENSE`) before making the repository public.
- [ ] Remove or hide public-facing legacy names from README and public docs:
  `AUTHRAIL_`, `AuthRail`, `ActionRequest`, `/api/v1/action-requests`,
  `dry_run`, and generic `connector` request shape.
- [ ] Add `REFUNDHOLD_` aliases for public environment variables before
  rewriting `.env.example`; keep `AUTHRAIL_` as hidden compatibility fallback.
- [ ] Publish only a refund-specific public API/SDK contract. Do not expose
  generic action/connector language as the primary public API.
- [ ] Keep live Stripe refunds blocked and document dormant `LIVE`/`DIRECT`
  schema values as internal/reserved.
- [ ] Remove private/hosted deployment docs from the public tree or rewrite them
  as generic self-hosting docs without production domain assumptions.
- [ ] Confirm `.env`, `.env.local`, screenshots, and any local real keys are not
  tracked and not present in release artifacts.

### High

- [ ] Rename public package/workspace names from `authrail` to RefundHold names.
- [ ] Change public local DB examples from `authrail` credentials to
  `refundhold` or explicit placeholders.
- [ ] Rewrite smoke scripts to use `/api/v1/refund-requests` and public
  `demo_simulation` language.
- [ ] Split commercial auth/provisioning/RBAC operations from the public demo.
- [ ] Split Stripe test-mode adapter from default open-source demo, or clearly
  mark it optional and test-mode only.
- [ ] Add `SECURITY.md` with private disclosure instructions before public
  issue traffic starts.
- [ ] Add a documented secret scanning step to CI or release prep.

### Medium

- [ ] Create `docs/open-source.md` and `docs/local-demo.md`.
- [ ] Add `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and `DISCLAIMER.md`.
- [ ] Decide whether Prisma schema/migrations are published as-is, hidden
  behind a new demo schema, or migrated in a future major release.
- [ ] Add tests that public docs never mention the compatibility endpoint.
- [ ] Add tests that public SDK exports do not include `ActionRequest`,
  `AuthRail`, `connector`, or `dry_run`.
- [ ] Replace policy/seed names in `prisma/seed-demo.ts` that say `dry_run`
  with "demo simulation" in a later behavior-safe docs/data PR.

### Low

- [ ] Add a repository architecture diagram for open-core contributors.
- [ ] Add example AI-agent prompts to `refundhold-sdk/examples`.
- [ ] Add a public roadmap that separates demo simulation, Stripe test-mode,
  and future live-money readiness.
- [ ] Add a public trademark note for Stripe and RefundHold.

## 9. Implementation Plan: Follow-Up Codex Tasks

Each task below is intentionally small, reviewable, and testable.

1. **Public Docs Legacy Cleanup**
   - Files: `README.md`, `src/app/docs/quickstart/page.tsx`,
     related page tests.
   - Change: remove public references to `AUTHRAIL_DEMO_AGENT_API_KEY` and
     `/api/v1/action-requests`; keep compatibility details internal.
   - Verify: `pnpm test -- src/app/docs/quickstart/page.test.tsx
     src/app/page.test.tsx`.

2. **Add RefundHold Environment Aliases**
   - Files: env config modules and tests only.
   - Change: accept `REFUNDHOLD_*` names first and keep `AUTHRAIL_*` fallback.
   - Verify: targeted config tests plus `pnpm typecheck`.

3. **Rewrite `.env.example` For Public Naming**
   - Files: `.env.example`, README setup snippet.
   - Change: public examples use `REFUNDHOLD_*` and `refundhold` local DB names;
     legacy fallbacks move to internal docs.
   - Verify: docs tests and local seed instructions.

4. **Public Refund SDK Types**
   - Files: new `packages/refundhold-sdk` or `src/lib/public-contracts`.
   - Change: introduce `RefundRequest` public types and response schemas without
     changing routes.
   - Verify: type tests and API response mapper tests.

5. **Smoke Script Public Endpoint Pass**
   - Files: `scripts/smoke-action-request.ts`,
     `scripts/smoke-approval-flow.ts`, `scripts/smoke-execution-flow.ts`, tests.
   - Change: call `/api/v1/refund-requests` aliases and report public response
     fields.
   - Verify: script unit tests; do not run smoke scripts without local DB/server.

6. **Demo Seed Naming Cleanup**
   - Files: `prisma/seed-demo.ts`, `prisma/seed-demo.test.ts`.
   - Change: rename visible seeded policy/connector names from `dry_run` to
     "demo simulation"; do not rename DB enum values.
   - Verify: seed tests and dashboard page tests.

7. **Create Public Governance Files**
   - Files: `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`,
     `DISCLAIMER.md`, `CODE_OF_CONDUCT.md`.
   - Change: add release-governance docs.
   - Verify: docs lint if available; manual review.

8. **Open-Core Package Skeleton**
   - Files: `packages/refundhold-core`, workspace config, package manifests.
   - Change: extract policy evaluator and public contract types without moving
     route behavior.
   - Verify: `pnpm test`, `pnpm typecheck`, `pnpm lint`.

9. **Private Docs Split**
   - Files: `README_DEPLOY_DOKPLOY.md`, `AUTH_ACTIVATION_RUNBOOK.md`,
     `STRIPE_TEST_MODE_E2E.md`, `BACKUP_RESTORE.md`, `docs/internal/*`.
   - Change: move or mark private docs so public tree contains only safe local
     demo docs.
   - Verify: public docs navigation tests and a release-file inventory check.

10. **Release Inventory Check**
    - Files: release script or checklist.
    - Change: add a command/checklist that scans for banned public strings,
      secret-like values, ignored env files, and live-refund claims before
      publication.
    - Verify: run the release inventory check in CI.

## Validation Notes For This Audit

Inspected package scripts:

- Safe static checks available now:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm prisma validate`
- Broader safe local checks before implementation PRs:
  - `pnpm test`
  - `pnpm build`
- Checks that require local services or secrets and should not run as routine
  static validation:
  - `pnpm db:up`, `pnpm db:migrate`, `pnpm db:seed`,
    `pnpm db:seed:demo`
  - `pnpm smoke:action-request`, `pnpm smoke:approval-flow`,
    `pnpm smoke:execution-flow`
  - `pnpm auth:provision-user`
  - `pnpm stripe:e2e:test`

Checks to run before any future implementation PR:

1. `pnpm prisma generate`
2. `pnpm prisma validate`
3. `pnpm test`
4. `pnpm typecheck`
5. `pnpm lint`
6. `pnpm build`

For this audit document, the only intended working tree change is this file:
`docs/internal/open-source-readiness-audit.md`.
