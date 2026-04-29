# RefundHold Dokploy Deployment

This guide prepares RefundHold for Dokploy + Traefik deployment as a separate
Docker Compose app. It does not require nginx on the host and does not publish
host ports.

## Files

- `Dockerfile`: production Next.js image. It runs `pnpm prisma generate` before
  `pnpm build`, then starts with `pnpm prisma migrate deploy && pnpm start`.
- `docker-compose.dokploy.yml`: Dokploy-oriented Compose file with `web` and a
  private Postgres service.
- `.env.dokploy.example`: placeholder environment checklist for Dokploy.
- `.dockerignore`: keeps local dependencies, build output, Git data, and env
  files out of the Docker build context.

## Dokploy Setup

1. Create a new Dokploy project/app for RefundHold. Do not reuse the
   Novariel/UltraEco project.
2. Point the app to this repository and select `docker-compose.dokploy.yml`.
3. Configure domains in Dokploy/Traefik:
   - `refundhold.com`
   - `www.refundhold.com`
4. Route Traefik to service `web` on container port `3000`.
5. Do not add host port publishing. The Compose file uses `expose: "3000"`.
6. Add the environment variables from `.env.dokploy.example` in Dokploy with
   real deployment values.
7. Deploy the new RefundHold app only after DNS for both domains points to the
   VPS.

## Required Environment Variables

- `POSTGRES_DB`
- `POSTGRES_USER`
- `POSTGRES_PASSWORD`
- `AUTHRAIL_DEMO_AGENT_API_KEY`
- `AUTHRAIL_DEMO_REVIEWER_EMAIL`
- `AUTHRAIL_ACTION_REQUEST_BASE_URL`
- `AUTHRAIL_DEMO_ACCESS_ENABLED`
- `AUTHRAIL_DEMO_ACCESS_PASSWORD`

Keep the existing `AUTHRAIL_*` names for now. They are still used by the code.

## Auth/RBAC Foundation

RefundHold includes a database foundation for future human login and
organization-level RBAC. The schema separates human organization memberships
from agent API keys: AI agents continue to authenticate with agent API keys, and
those keys are not user sessions.

The Better Auth dependency and server-side configuration scaffold are present,
but auth is disabled by default with `AUTHRAIL_AUTH_ENABLED=false` and
`AUTHRAIL_AUTH_REQUIRED=false`. When auth is disabled, `BETTER_AUTH_SECRET` is
not required. If auth is enabled later, the app fails closed unless
`BETTER_AUTH_SECRET` is configured as a server-side environment variable.

Better Auth core tables now exist under separate `Auth*` Prisma models:
`AuthUser`, `AuthSession`, `AuthAccount`, and `AuthVerification`. `AuthUser` is
the future global human auth identity and stores globally unique email
addresses in `auth_users`. The existing `User` model remains the
organization-scoped domain user used by approvals and audit records.

The demo gate remains active for `/app` when configured. A disabled-safe
Better Auth route handler exists at `/api/auth/[...all]`, and `/login` exists
as a scaffold. With `AUTHRAIL_AUTH_ENABLED=false`, `/api/auth/*` returns a
generic unavailable response and `/login` links back to `/demo-access` without
rendering a password form. `BETTER_AUTH_SECRET` is not required in this mode.

When auth is enabled in a controlled environment, Better Auth is configured
against the separate `Auth*` identity tables. Email/password sign-in is
prepared for provisioned users, public signup is disabled, OAuth providers are
not configured, and `/app` can be protected by session auth only when
`AUTHRAIL_AUTH_REQUIRED=true`. Do not set `AUTHRAIL_AUTH_REQUIRED=true` in
production until a provisioned auth user has been created and login has been
validated for that environment. Existing users are backfilled into memberships
as active reviewers so the current demo reviewer can keep approving and
executing controlled refund flows.

Controlled auth user provisioning is available through the manual script:

```bash
pnpm auth:provision-user
```

It is disabled unless `AUTHRAIL_AUTH_PROVISIONING_ENABLED=true` is set in the
local or staging environment. Provisioning requires
`AUTHRAIL_PROVISION_EMAIL`, `AUTHRAIL_PROVISION_PASSWORD`,
`AUTHRAIL_PROVISION_NAME`, `AUTHRAIL_PROVISION_ORGANIZATION_ID`, and
`AUTHRAIL_PROVISION_ROLE`. The script uses Better Auth's server-side email
signup API to create credential accounts, does not print passwords or tokens,
and blocks `refundhold.com` production URLs by default.

The current session context resolver maps a Better Auth `AuthUser` session to
the first active `Membership` ordered by creation time, then returns the
organization, organization-scoped domain `User`, role, and RBAC permissions.
This is an MVP limitation until organization switching is introduced.

Sensitive action endpoints now support server-side session RBAC for:

- `POST /api/v1/action-requests/[id]/approve`
- `POST /api/v1/action-requests/[id]/reject`
- `POST /api/v1/action-requests/[id]/execute`
- the matching dashboard server actions

When `AUTHRAIL_AUTH_ENABLED=true` and a valid Better Auth session exists, the
session resolves to an active membership and the action must belong to the same
organization. `OWNER`, `ADMIN`, and `REVIEWER` can approve, reject, and execute
approved refund requests. `VIEWER` is read-only and cannot perform those
sensitive actions.

Demo compatibility remains while `AUTHRAIL_AUTH_REQUIRED=false`: if no valid
session exists, the demo reviewer path can still resolve the configured demo
reviewer or `X-RefundHold-Reviewer-Email` header to an active membership.
Setting `AUTHRAIL_AUTH_REQUIRED=true` disables that fallback and requires a
real human session. Agent API keys are never accepted for approve, reject, or
execute; they remain limited to action-request intake.

The `/app` dashboard, refund queue, and refund detail pages are
organization-scoped. With `AUTHRAIL_AUTH_REQUIRED=false`, the demo gate remains
active and app data is scoped to the configured demo reviewer organization.
With `AUTHRAIL_AUTH_REQUIRED=true`, those pages require a valid Better Auth
session, resolve the first active membership by creation time, and filter all
dashboard data by that membership's `organizationId`. There is no organization
switcher yet. Requests from another organization return a generic not-found
state, and Agent API keys cannot access `/app`.

The dashboard header is session-aware. In demo mode it shows the demo reviewer,
demo role, dry-run status, and an `Exit demo` control that clears only the demo
access cookie. In session mode it shows the authenticated user email/name,
active organization, role, permission summary, and a `Sign out` control that
uses Better Auth's sign-out endpoint. Demo exit and Better Auth sign-out remain
separate paths.

The refund detail page hides or disables sensitive review and execution buttons
based on the resolved role permissions. `VIEWER` users see read-only messaging;
`OWNER`, `ADMIN`, and `REVIEWER` can see eligible approve, reject, and dry-run
execution controls when the request state allows it. This is only a UX layer:
server-side RBAC on approve, reject, and execute remains the source of truth.

Current planned roles are `OWNER`, `ADMIN`, `REVIEWER`, and `VIEWER`. The
initial helper map treats owners as full organization admins, admins as refund
control managers, reviewers as approval/execution reviewers, and viewers as
read-only dashboard users.

The current `User` model is organization-scoped: `organizationId` is required
and email uniqueness is scoped to `@@unique([organizationId, email])`. Do not
add global uniqueness to `User.email`; global uniqueness belongs to `AuthUser`.
`User.authUserId` and `Membership.authUserId` are nullable compatibility links
for future RBAC session checks.

## Stripe Safety Baseline

Stripe integration is disabled by default. The app includes a server-only Stripe
test client scaffold, guarded test-mode refund execution, and disabled
test-mode webhook handling. It does not execute refunds from the current demo
flow.

RefundHold v1 is test-mode only for future Stripe work. Live refunds are
intentionally blocked: if `AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED=true`, the
Stripe safety configuration fails closed. Do not use live Stripe keys in this
app. `AUTHRAIL_STRIPE_TEST_SECRET_KEY` must be empty while Stripe is disabled,
or use a server-side test/sandbox key prefix only: `sk_test_` or `rk_test_`.

Keep Stripe secret and restricted keys out of Git, client-side code, logs, and
HTML. Configure them only as server-side environment variables. Webhook signing
secrets are separate from API keys and must also remain server-side only.

Stripe API calls happen only when the test-mode feature flags are enabled and an
explicit server-side execution route handles an approved Stripe test refund.
Live Stripe keys remain blocked by configuration.

Stripe persistence models store safe Stripe payment snapshots, test-mode refund
execution records, and deduplicated webhook event records.

Stripe test object reflection is available for future agent requests. When test
mode flags and server-side test keys are configured, RefundHold can reflect a
test PaymentIntent or Charge into a safe snapshot and create an action request
for policy review without exposing full Stripe payloads.

Stripe test-mode refund execution is available but disabled by default. It
requires both `AUTHRAIL_STRIPE_TEST_MODE_ENABLED=true` and
`AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED=true`, and it only executes approved
Stripe test action requests with `livemode=false`. Live refunds remain
intentionally blocked.

Stripe test-mode webhooks are also disabled by default. They require
`AUTHRAIL_STRIPE_WEBHOOKS_ENABLED=true` and
`AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET` configured as a server-side environment
variable. RefundHold verifies `Stripe-Signature` against the raw request body
before processing, stores only safe webhook payload snapshots, and only mutates
records for events with `livemode=false`. The initial supported events are
`refund.created`, `refund.updated`, and `refund.failed`. Live mode remains
blocked.

The reviewer UI can display Stripe test-mode payment snapshots, test refund
execution state, and webhook reconciliation state from safe stored fields only.
It does not expose Stripe API keys, webhook secrets, signatures, full Stripe
payloads, or idempotency raw keys. Test execution remains disabled unless the
server-side flags are enabled, and live refunds remain unavailable.

## Database

The Compose file creates a private Postgres service named `postgres` and a
persistent volume named `refundhold_postgres_data`. It builds `DATABASE_URL`
internally from the `POSTGRES_*` variables:

```text
postgresql://POSTGRES_USER:POSTGRES_PASSWORD@postgres:5432/POSTGRES_DB?schema=public
```

The `web` service waits for Postgres to become healthy before starting.
Migrations run automatically on container start through:

```bash
pnpm prisma migrate deploy && pnpm start
```

## Hosted Demo Notes

Set:

```env
AUTHRAIL_ACTION_REQUEST_BASE_URL=https://refundhold.com
AUTHRAIL_DEMO_ACCESS_ENABLED=true
```

Use long random values for:

```env
POSTGRES_PASSWORD
AUTHRAIL_DEMO_AGENT_API_KEY
AUTHRAIL_DEMO_ACCESS_PASSWORD
```

Run demo seeding only from a trusted environment. The seed can print a generated
demo agent API key if `AUTHRAIL_DEMO_AGENT_API_KEY` is not set, so set that
variable before seeding a hosted demo.

## Local Validation

These checks do not deploy anything:

```bash
pnpm install --frozen-lockfile
pnpm prisma generate
pnpm build
docker compose --env-file .env.dokploy.example -f docker-compose.dokploy.yml config
```

Do not run `docker compose up` against this file unless you intentionally want
to start the Dokploy-style stack locally.

## Isolation Rules

- Do not modify the Novariel/UltraEco Dokploy project.
- Do not reuse Novariel environment variables, database, volumes, or containers.
- Do not add nginx host configuration.
- Do not publish host ports from RefundHold.
- Keep RefundHold as its own Dokploy project/app.
