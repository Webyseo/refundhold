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

## Stripe Safety Baseline

Stripe integration is disabled by default. The app includes a server-only Stripe
test client scaffold, but it does not call Stripe, create webhooks, or execute
refunds from the current demo flow.

RefundHold v1 is test-mode only for future Stripe work. Live refunds are
intentionally blocked: if `AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED=true`, the
Stripe safety configuration fails closed. Do not use live Stripe keys in this
app. `AUTHRAIL_STRIPE_TEST_SECRET_KEY` must be empty while Stripe is disabled,
or use a server-side test/sandbox key prefix only: `sk_test_` or `rk_test_`.

Keep Stripe secret and restricted keys out of Git, client-side code, logs, and
HTML. Configure them only as server-side environment variables. Webhook signing
secrets are separate from API keys and must also remain server-side only.

No Stripe API calls happen unless future feature flags and explicit server-side
routes use the test client. Live Stripe keys remain blocked by configuration.

Stripe persistence models exist for future test-mode execution. The database can
store safe Stripe payment snapshots, future test-mode refund execution records,
and deduplicated webhook event records. The current app still does not call
Stripe, execute refunds, or expose a Stripe webhook route.

Stripe test object reflection is available for future agent requests. When test
mode flags and server-side test keys are configured, RefundHold can reflect a
test PaymentIntent or Charge into a safe snapshot and create an action request
for policy review. It still does not execute refunds; refund execution belongs
to a later PR.

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
