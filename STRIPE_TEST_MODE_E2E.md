# RefundHold Stripe Test-Mode E2E

This workflow validates the full RefundHold Stripe test-mode path locally or in
a controlled non-production environment. It is manual by design and must not run
in normal CI.

## What It Covers

The script validates:

1. Create a Stripe test PaymentIntent using a test payment method.
2. Submit a RefundHold `stripe_test` refund proposal.
3. Create an `ActionRequest` from the reflected test PaymentIntent.
4. Approve the action request.
5. Execute a Stripe test-mode refund.
6. Confirm `StripeRefund` persistence and idempotency hash storage.
7. Retry execution and confirm duplicate execution is rejected.
8. Optionally wait for Stripe CLI webhook reconciliation.
9. Fetch the RefundHold detail UI and confirm safe Stripe status is shown.

The script prints only non-secret identifiers such as `pi_...`, `ch_...`,
`re_...`, `actionRequestId`, and `executionId`.

## Required Local Setup

Use a local `.env` or `.env.local` file. Environment files are ignored by Git in
this repo.

Required variables:

```env
BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://...

AUTHRAIL_DEMO_AGENT_API_KEY=...
AUTHRAIL_DEMO_REVIEWER_EMAIL=demo.reviewer@refundhold.com

AUTHRAIL_STRIPE_TEST_MODE_ENABLED=true
AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED=true
AUTHRAIL_STRIPE_TEST_SECRET_KEY=...
AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED=false
```

Use a Stripe sandbox/test secret or restricted key only. Do not use live keys.
Do not paste keys into code, docs, screenshots, issue comments, or logs.

Optional variables:

```env
STRIPE_E2E_AMOUNT_MINOR=10000
STRIPE_E2E_CURRENCY=usd
STRIPE_E2E_EXPECT_WEBHOOK=true
STRIPE_E2E_WEBHOOK_WAIT_MS=20000

AUTHRAIL_STRIPE_WEBHOOKS_ENABLED=true
AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET=...
```

If hosted-demo protection is enabled locally, also set:

```env
AUTHRAIL_DEMO_ACCESS_ENABLED=true
AUTHRAIL_DEMO_ACCESS_PASSWORD=...
```

## Run Locally

Start Postgres, apply migrations, seed the local demo data, and start the app:

```bash
pnpm db:up
pnpm prisma migrate dev
pnpm db:seed
pnpm dev
```

In another terminal, run:

```bash
pnpm stripe:e2e:test
```

The script fails closed if required variables are missing, if live refunds are
enabled, if a live key prefix is used, or if `BASE_URL` points at production.

## Webhook Reconciliation With Stripe CLI

To validate webhook reconciliation locally, install and authenticate the Stripe
CLI, then keep this command running while the app is on port 3000:

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Stripe prints a webhook signing secret for that local listener. Keep it private
and set it only in your local environment as
`AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET`. Do not commit it.

Then set:

```env
AUTHRAIL_STRIPE_WEBHOOKS_ENABLED=true
STRIPE_E2E_EXPECT_WEBHOOK=true
```

Run the E2E script again. With `STRIPE_E2E_EXPECT_WEBHOOK=true`, the script
waits for a matching webhook event and fails if reconciliation does not happen.

## UI Check

The script fetches:

```text
/app/action-requests/<actionRequestId>
```

It checks that the page contains safe status text such as:

- `Stripe test object`
- `Stripe test refund execution`
- `Test mode only`
- `No live money movement`
- `Protected by idempotency hash`

It also checks that the page does not contain Stripe API keys, webhook signing
secrets, `Stripe-Signature`, raw idempotency keys, or Stripe secret environment
variable names.

## Do Not Do This

- Do not run this against production.
- Do not use live Stripe keys.
- Do not enable live refunds.
- Do not commit `.env`, `.env.local`, or screenshots containing secrets.
- Do not paste webhook signing secrets into chat, logs, tickets, or docs.
- Do not add this script to normal CI.
- Do not mix this workflow with login, pricing, self-service, Stripe Connect, or
  redesign work.

## References

- [Stripe CLI: forward events to your local webhook endpoint](https://docs.stripe.com/stripe-cli/use-cli)
- [Stripe testing: use test API keys and test PaymentMethods](https://docs.stripe.com/testing)
