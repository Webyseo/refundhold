# RefundHold Auth Activation Runbook

## Purpose

This runbook describes a controlled staging or production activation path for
RefundHold human login and organization RBAC.

It does not enable auth by itself. It is an operator runbook: every step must be
performed manually by an authorized operator in the target environment.

Keep the demo gate available until final cutover. The demo gate is the rollback
path for the hosted demo while session auth is introduced.

## Current State

- `AUTHRAIL_AUTH_ENABLED=false` by default.
- `AUTHRAIL_AUTH_REQUIRED=false` by default.
- The Better Auth route exists at `/api/auth/[...all]`, but it returns a
  disabled response while auth is off.
- `/login` exists, but it shows the disabled demo state unless auth is enabled.
- Public signup is disabled.
- Human users must be provisioned manually.
- `AuthUser` is the global Better Auth identity.
- `User` is the organization-scoped RefundHold domain user used for approvals
  and audit records.
- `Membership` maps an `AuthUser` and domain `User` to an organization and
  role.
- Agent API keys are never human sessions. They remain only for action-request
  intake.

## Environment Variables

Controlled auth activation requires these server-side variables:

```env
AUTHRAIL_AUTH_ENABLED=true
AUTHRAIL_AUTH_REQUIRED=false
BETTER_AUTH_URL=https://refundhold.com
BETTER_AUTH_SECRET=<generated secret, never commit>
```

Provisioning uses these variables only while creating or updating controlled
users:

```env
AUTHRAIL_AUTH_PROVISIONING_ENABLED=true
AUTHRAIL_PROVISION_EMAIL=<operator email>
AUTHRAIL_PROVISION_PASSWORD=<strong password>
AUTHRAIL_PROVISION_NAME=<operator name>
AUTHRAIL_PROVISION_ORGANIZATION_ID=<organization id>
AUTHRAIL_PROVISION_ROLE=OWNER|ADMIN|REVIEWER|VIEWER
```

Rules:

- Keep `AUTHRAIL_AUTH_REQUIRED=false` during first login validation.
- Disable `AUTHRAIL_AUTH_PROVISIONING_ENABLED` again after provisioning.
- Do not print or store secrets in Git.
- Use a different `BETTER_AUTH_SECRET` for every environment.
- Keep Stripe flags off unless running a separate Stripe test-mode validation.
- Do not configure live Stripe during auth activation.

## Secret Generation

Generate a unique Better Auth secret per environment:

```bash
openssl rand -base64 32
```

Rules:

- Do not reuse local secrets in staging or production.
- Do not paste secrets into chat, tickets, logs, docs, or screenshots.
- Do not commit `.env`, `.env.local`, Dokploy exports, or screenshots that
  contain secrets.
- Store the value only in the server-side environment manager for the target
  environment.

## Pre-activation Checklist

Before changing any auth variable:

- Create a RefundHold Postgres backup.
- Verify `pg_restore -l` can read the backup.
- Confirm the expected commit is deployed.
- Confirm `https://refundhold.com` returns 200.
- Confirm `/demo-access` works.
- Confirm `/app` works with a valid demo cookie.
- Confirm `/login` shows `Login is not enabled for this demo.` before auth is
  enabled.
- Confirm `/api/auth/get-session` returns `auth_disabled` or equivalent before
  auth is enabled.
- Confirm `https://novariel.app` and `https://www.novariel.app` return 200.
- Confirm Stripe flags are off:
  - `AUTHRAIL_STRIPE_TEST_MODE_ENABLED=false`
  - `AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED=false`
  - `AUTHRAIL_STRIPE_WEBHOOKS_ENABLED=false`
  - `AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED=false`
  - no Stripe keys configured

## Stage 1 - Enable Auth Without Requiring It

This stage enables Better Auth but keeps the demo path available.

1. Set:

   ```env
   AUTHRAIL_AUTH_ENABLED=true
   AUTHRAIL_AUTH_REQUIRED=false
   BETTER_AUTH_URL=https://refundhold.com
   BETTER_AUTH_SECRET=<generated secret>
   ```

2. Keep public signup disabled. Do not add any signup link or self-service
   account creation path.
3. Keep the demo gate enabled.
4. Keep Stripe flags off.
5. Redeploy only the RefundHold Dokploy project.

Validation:

- `/login` shows the email/password form.
- `/login` does not show signup, create account, or OAuth.
- `/api/auth/get-session` no longer returns `auth_disabled`.
- `/demo-access` still works.
- `/app` still works through the demo gate.
- No production user exists yet unless explicitly provisioned.
- Recent application logs contain no auth configuration errors.

## Stage 2 - Provision a Controlled User

Provision only after Stage 1 is deployed and healthy.

1. Get the target organization id safely. Prefer a read-only database query or
   an internal admin note that lists organization ids. Do not print unnecessary
   user data.
2. Enable provisioning only for the provisioning command:

   ```env
   AUTHRAIL_AUTH_PROVISIONING_ENABLED=true
   AUTHRAIL_PROVISION_EMAIL=<operator email>
   AUTHRAIL_PROVISION_PASSWORD=<strong password>
   AUTHRAIL_PROVISION_NAME=<operator name>
   AUTHRAIL_PROVISION_ORGANIZATION_ID=<organization id>
   AUTHRAIL_PROVISION_ROLE=OWNER|ADMIN|REVIEWER|VIEWER
   ```

3. Run:

   ```bash
   pnpm auth:provision-user
   ```

4. Provision `OWNER` for a first controlled operator, or `REVIEWER` for a
   narrower approval-flow test.
5. Disable `AUTHRAIL_AUTH_PROVISIONING_ENABLED` immediately after provisioning.
6. Do not print passwords, session cookies, tokens, or raw secret values.

Validation:

- The user can sign in at `/login`.
- A session cookie is set by the browser.
- `/app` works with the authenticated session.
- The dashboard header shows authenticated session, email/name, organization,
  and role.
- `Sign out` works.
- The demo gate still works while `AUTHRAIL_AUTH_REQUIRED=false`.

Operational note:

- The current provisioning CLI blocks production RefundHold URLs when `BASE_URL`
  is set to `refundhold.com` or `www.refundhold.com`. If that guard blocks a
  production provisioning attempt, stop and use an explicitly approved
  production provisioning path rather than bypassing the guard casually.

## Stage 3 - Validate RBAC

Use provisioned test users and safe temporary refund requests where possible.

Required checks:

- `REVIEWER` can approve, reject, and execute eligible dry-run requests.
- `VIEWER` can view but cannot approve, reject, or execute.
- `OWNER` or `ADMIN` can approve, reject, and execute eligible requests if
  those roles are part of the test.
- Agent API keys cannot approve, reject, or execute.
- Cross-organization request detail is blocked with a generic not-found or
  forbidden state.
- `/app` data is scoped to the active membership organization.
- `/login` still does not show signup, create account, or OAuth.
- Audit events record the safe actor source, role, and domain user id.

## Stage 4 - Optional Auth-required Test

Run this stage in staging first. Production should only use this stage after
staging or local tests pass, a controlled user is provisioned, and rollback is
ready.

1. Set:

   ```env
   AUTHRAIL_AUTH_ENABLED=true
   AUTHRAIL_AUTH_REQUIRED=true
   ```

2. Redeploy only RefundHold.
3. Validate:
   - `/app` without a session redirects to `/login?next=/app`.
   - `/app/action-requests` without a session redirects to login with a safe
     internal `next` path.
   - `/app` with a valid session works.
   - Demo fallback no longer authorizes sensitive actions.
   - `/demo-access` behavior is understood and documented for the environment.
   - `/login` sanitizes external `next` values back to `/app`.
   - `VIEWER` remains read-only.
   - `REVIEWER`, `ADMIN`, and `OWNER` keep the expected permissions.

Do not enable `AUTHRAIL_AUTH_REQUIRED=true` in production until staging/local
tests pass. If production is used, schedule a small maintenance window or be
ready to roll back immediately.

## Rollback Procedure

Rollback is configuration-only unless a separate code deploy introduced a bug.

1. Set:

   ```env
   AUTHRAIL_AUTH_REQUIRED=false
   ```

2. Redeploy only RefundHold.
3. If the app is still unhealthy, set:

   ```env
   AUTHRAIL_AUTH_ENABLED=false
   BETTER_AUTH_SECRET=
   BETTER_AUTH_URL=
   AUTHRAIL_AUTH_PROVISIONING_ENABLED=false
   ```

4. Redeploy only RefundHold again.
5. Confirm:
   - `/demo-access` works.
   - `/app` works with a valid demo cookie.
   - `/login` returns the disabled demo state.
   - `/api/auth/get-session` returns `auth_disabled` or equivalent.
   - `https://novariel.app` and `https://www.novariel.app` return 200.

Do not restore the database unless a separate data corruption issue is proven.
Keep the pre-activation backup available until the auth activation window is
closed.

## Failure Modes

- `BETTER_AUTH_SECRET` missing while `AUTHRAIL_AUTH_ENABLED=true`.
- `BETTER_AUTH_URL` points to the wrong origin.
- Auth required is enabled before any user is provisioned.
- The user exists in `AuthUser` but has no credential account.
- The user has no active `Membership`.
- The user has the wrong role.
- Public signup is accidentally enabled.
- Session cookie is not set by the browser.
- Reverse proxy, host, HTTPS, or cookie-domain mismatch.
- Demo gate behavior is misunderstood during the transition.
- Agent API keys are confused with human sessions.
- Cross-organization data leakage due to missing organization scoping.
- Stripe flags are accidentally changed during auth work.

## Security Notes

- Do not expose `BETTER_AUTH_SECRET`.
- Do not print cookies or session tokens.
- Do not store passwords in Git, docs, screenshots, or tickets.
- Do not manually hash passwords or write credential records by hand.
- Use the Better Auth provisioning/API path only.
- Keep public signup disabled.
- Keep agent API keys separate from human sessions.
- Keep Stripe flags off during auth activation.
- Keep live Stripe disabled.
- Keep demo gate available until the final cutover decision.

## Operator Checklist

- [ ] Backup created.
- [ ] Backup verified with `pg_restore -l`.
- [ ] Latest expected RefundHold commit deployed.
- [ ] Auth flags checked before activation.
- [ ] Stripe flags checked and off.
- [ ] Novariel URLs checked.
- [ ] `AUTHRAIL_AUTH_ENABLED=true` set.
- [ ] `AUTHRAIL_AUTH_REQUIRED=false` set.
- [ ] Unique `BETTER_AUTH_SECRET` stored server-side.
- [ ] `BETTER_AUTH_URL` set for the target environment.
- [ ] RefundHold redeployed.
- [ ] `/login` form validated.
- [ ] Controlled user provisioned.
- [ ] `AUTHRAIL_AUTH_PROVISIONING_ENABLED=false` restored.
- [ ] Login validated.
- [ ] Role and session context validated.
- [ ] Sensitive actions validated.
- [ ] Demo gate validated.
- [ ] Rollback steps reviewed or tested.
- [ ] Novariel revalidated.
