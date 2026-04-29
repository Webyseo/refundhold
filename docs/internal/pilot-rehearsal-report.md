# RefundHold Pilot Rehearsal Report

Date: 2026-04-29
Environment: Local Next.js dev server at `http://localhost:3000`, using the existing local environment. Stripe test-mode was not configured during this rehearsal.
Rehearsal type: Controlled demo simulation rehearsal with Stripe test-mode boundary review.

## Summary

RefundHold is ready for a controlled demo simulation pilot focused on the public product story, public demo, quickstart, and trust pages.

RefundHold is not ready for a controlled Stripe test-mode pilot from this local environment because Stripe test-mode was not configured and the local demo API key available to the app was rejected by the public refund request API. No Stripe calls were made.

The strongest user-facing flow is:

1. Visitor lands on `/`.
2. Visitor opens `/demo`.
3. Visitor completes either approve or reject path.
4. Visitor sees the audit trail and no-money-moved safety message.
5. Visitor opens `/docs/quickstart` for integration context.
6. Visitor can contact RefundHold through `/contact`.

## Public product flow

Result: Pass for controlled demo simulation.

Verified routes:

- `/`: loaded and clearly positioned RefundHold as stopping AI agents from refunding Stripe money without approval.
- `/demo`: loaded without login, password, or API key.
- `/demo`: approve path completed and showed an audit trail.
- `/demo`: reject path completed and showed an audit trail.
- `/docs/quickstart`: loaded and documented `/api/v1/refund-requests` as the preferred public endpoint.
- `/contact`: loaded and provided a test-mode pilot request path.
- `/security`: loaded and clearly stated live refunds are blocked in v1.
- `/privacy`: loaded and stated the page is a plain-language placeholder.
- `/terms`: loaded and stated the page is a plain-language placeholder.

User understanding check:

- RefundHold controls AI-generated Stripe refunds before they continue.
- Demo simulation does not move money.
- Stripe test-mode is described separately from live mode.
- Live refunds are blocked in v1.
- Contact path exists for a test-mode pilot.

Observed issue:

- The quickstart `Copy curl` button did not report `Copied` in the in-app browser rehearsal, so `api_curl_copied` was not observed in server logs. This may be browser clipboard permission behavior, but it should be rechecked before relying on copy completion as an activation signal.

## Local quickstart check

Result: Partially verified without running state-changing setup commands.

README and `/docs/quickstart` both reference the expected local command sequence:

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed:demo
pnpm dev
```

Package script check:

- `pnpm dev`: exists and was run successfully.
- `pnpm db:up`: exists.
- `pnpm db:migrate`: exists.
- `pnpm db:seed:demo`: exists.
- `pnpm typecheck`: exists.
- `pnpm lint`: exists.
- `pnpm build`: exists.

Commands not run:

- `pnpm install` was not run because dependencies were already installed.
- `cp .env.example .env` was not run because this would change local configuration.
- `pnpm db:up`, `pnpm db:migrate`, and `pnpm db:seed:demo` were not run because they change local database state. The API rehearsal instead used the existing local app state.

Setup gap:

- The quickstart shows `<agent_api_key>`, but a pilot user still needs a clear safe path for obtaining a valid demo agent API key without exposing secrets.

## API rehearsal

Result: Blocked by local demo API key mismatch.

Tested:

- `POST /api/v1/refund-requests` with demo simulation payload.

Observed response:

- HTTP status: `401`
- Public error: API key is invalid.

Because no `refund_request_id` was returned, these decision aliases were not called:

- `POST /api/v1/refund-requests/[id]/approve`
- `POST /api/v1/refund-requests/[id]/reject`
- `POST /api/v1/refund-requests/[id]/execute`

Safety notes:

- No API key value was printed.
- No live Stripe call was made.
- No live Stripe secret was used.
- No production customer data was used.

Safe next setup step:

- Run the demo seed in a controlled local database environment and use the generated or configured demo agent API key only from local environment storage. Do not paste the key into shared logs or reports.

## API rehearsal rerun

Date: 2026-04-29
Environment: Local Next.js dev server at `http://localhost:3000`, using an isolated local Docker Postgres rehearsal database because the default local `localhost:5432` connection was shadowed by another host Postgres and the existing Docker database had migration drift.

Result: Pass for controlled demo simulation API creation and public decision aliases.

Key setup:

- `.env` existed and was ignored by git.
- A local-only `REFUNDHOLD_DEMO_AGENT_API_KEY` was configured without printing the value.
- The legacy fallback variable remained untouched.
- No API key, Authorization header, private demo password, or `.env` value was printed.

Local data setup:

- `pnpm db:up` succeeded.
- `pnpm db:migrate` against the default local database did not proceed because Prisma detected drift and requested a reset. The reset was not run.
- Existing default local seed did not proceed because that database was missing current auth tables.
- A separate local rehearsal database was created in Docker Postgres, existing migrations were applied there, and `pnpm db:seed:demo` succeeded.
- The demo seed confirmed that the demo agent API key was configured from `REFUNDHOLD_DEMO_AGENT_API_KEY`.

Endpoint rehearsal:

- `POST /api/v1/refund-requests` returned `201`.
- The create response included `refund_request_id`.
- The create response included public decision language: `needs_review`.
- The create response included a human-readable reason.
- The create response included `review_url` under `/app/refund-requests/[id]`.
- `POST /api/v1/refund-requests/[id]/approve` returned `200` with public refund language.
- `POST /api/v1/refund-requests/[id]/reject` returned `200` with public refund language.
- `POST /api/v1/refund-requests/[id]/execute` returned `200` and recorded demo execution.

Safety:

- Separate refund requests were created for approve, reject, and execute so invalid state transitions were not forced.
- No Stripe call was made.
- No live Stripe secret was used.
- Live refunds remained blocked.
- The private demo access gate was not bypassed.

Remaining setup caveat:

- The documented local setup works when `DATABASE_URL` points at the intended local Postgres. On this machine, `localhost:5432` reached a different host Postgres, so the rehearsal used a process-local database URL override to reach Docker Postgres through the host network address.

## Reviewer app rehearsal

Result: Blocked by existing private demo access gate.

Routes attempted:

- `/app`
- `/app/onboarding`
- `/app/refund-requests`
- `/app/stripe`

Observed behavior:

- Each app route redirected to `/demo-access?next=...`.
- This is expected when the private demo gate is enabled.
- The gate was not bypassed.
- No private demo password was read, printed, or entered.

Reviewer app checks not completed in browser:

- `/app` starts with refunds needing review.
- `/app/refund-requests` uses refund request language.
- A refund detail page shows Summary, Decision needed, Policy matched, Current status, Audit trail, and collapsed Developer details.
- `/app/onboarding` shows demo simulation, Stripe test-mode, default rules, curl, and link to refund requests.
- `/app/stripe` clearly says live refunds are blocked in v1.

## Stripe test-mode boundary

Result: Not ready for controlled Stripe test-mode pilot in this environment.

Observed:

- Stripe test-mode configuration was not enabled in the local environment.
- The public and internal pages clearly separate demo simulation, Stripe test-mode, and live refunds.
- Live refunds are consistently described as blocked in v1.
- No Stripe calls were made.
- No live Stripe secrets were read or printed.

Before a Stripe test-mode pilot:

- Configure restricted Stripe test keys.
- Confirm webhook test settings if webhook flows are part of the pilot.
- Keep test objects separate from production customer data.
- Verify `/app/stripe` after private demo access is available.

## Activation event check

Result: Pass for route behavior and most public demo events.

Direct endpoint checks:

- Accepted event payload returned HTTP `200`.
- Unknown event payload returned HTTP `400`.

Observed server log events during public rehearsal:

- `landing_viewed`
- `landing_demo_cta_clicked`
- `demo_started`
- `demo_policy_matched`
- `demo_review_opened`
- `demo_refund_approved`
- `demo_refund_rejected`
- `demo_audit_viewed`
- `quickstart_viewed`

Not observed:

- `api_curl_copied`, because the quickstart copy button did not report a successful copy in the in-app browser rehearsal.

No third-party analytics, database persistence, cookies, user identification, email capture, IP enrichment, API keys, refund payloads, customer personal data, or Stripe calls were added or used for activation events.

## Potential pilot confusion

- API key setup is the largest likely confusion point. The quickstart uses `<agent_api_key>`, but the rehearsal environment had a local demo key that the API rejected.
- Private demo access blocks reviewer app routes. This is expected, but pilot testers need the private demo password or a local environment with the gate disabled.
- The quickstart copy button did not confirm copy success in the in-app browser, which could prevent `api_curl_copied` from appearing in logs.
- Stripe test-mode setup is still manual. A pilot user may not know which restricted test keys and webhook test settings are required.
- The execute endpoint may be confusing because demo simulation records execution but does not move money. Keep saying "record demo execution" in user-facing flows.
- The public demo audit trail is clear, but the app audit detail could not be browser-verified because of the private demo gate.
- Privacy and terms are correctly lightweight placeholders, but pilot users should be told they are not final legal documents before any production discussion.

## Go / No-go decision

Status: Ready for controlled demo simulation pilot.

Reason:

- The public story, no-login demo, approve/reject paths, audit trail, quickstart, contact path, and trust pages are usable and clear enough for a controlled demo simulation pilot.
- Live refunds remain blocked.
- Stripe test-mode was not configured, and the local refund API rehearsal was blocked by an invalid demo API key, so RefundHold is not ready for a controlled Stripe test-mode pilot from this environment.

No-go for Stripe test-mode pilot until:

- A valid local or hosted demo agent API key is configured and verified.
- Private reviewer access is available to the tester.
- Stripe test-mode settings are configured with restricted test keys.
- Webhook test settings are reviewed if webhook flows are in scope.

## Recommended next step

Run one controlled demo simulation pilot with a real tester using:

1. `/`
2. `/demo`
3. `/docs/quickstart`
4. `/contact`

Capture where the tester gets confused, especially around API key setup, copy curl behavior, private reviewer access, and the difference between demo simulation and Stripe test-mode.

Do not add pricing or more features until the API key setup and private reviewer access path are clearer for a controlled test-mode pilot.
