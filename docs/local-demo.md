# Local Demo

This guide runs the RefundHold local demo safely.

## What The Local Demo Proves

The local demo shows the core approval inbox flow:

- An AI support agent proposes a Stripe refund.
- RefundHold evaluates the refund policy.
- RefundHold returns an allowed, needs-review, or blocked decision.
- A refund that needs review appears in the approval inbox.
- The audit trail records the proposal, policy decision, review state, and demo
  execution evidence.

## What It Does Not Prove

The local demo does not prove production readiness. It does not prove live-money
refund execution, hosted operations, billing, customer data handling, webhook
callbacks, audit export, or final security review.

Demo simulation does not move money. Stripe test-mode uses test objects only.
Live refunds are blocked in v1.

## Local Setup

From the repository root:

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm db:migrate
pnpm db:seed:demo
pnpm dev
```

Open `http://localhost:3000/demo`.

## Demo Agent API Key

Set a private local demo agent API key before running the seed:

```bash
REFUNDHOLD_DEMO_AGENT_API_KEY="ar_demo_local_placeholder_value"
```

Use your own local placeholder value. Do not use a Stripe secret key. Do not
commit real API keys.

After setting or changing the key, run:

```bash
pnpm db:seed:demo
```

The seed stores only the matching hash.

## Demo Policy

- Under $50 -> allowed.
- $50-$500 -> needs human review.
- Over $500 -> blocked.

## Send A Refund Request

Use the public refund-request endpoint:

```bash
curl -X POST http://localhost:3000/api/v1/refund-requests \
  -H "Authorization: Bearer <agent_api_key>" \
  -H "Content-Type: application/json" \
  -d '{
    "stripe_mode": "demo_simulation",
    "amount": 42000,
    "currency": "usd",
    "reason": "AI support agent recommends refund"
  }'
```

The response includes `refund_request_id`, the decision, and a review URL when
human review is needed.

## Open The Demo UI

- Open `/demo` to try the public demo simulation.
- Open `/app/refund-requests` to view the approval inbox for local refund
  requests.

The private approval inbox may require the local demo access or reviewer setup
configured for your environment.

## Safety Notes

- Demo simulation does not move money.
- Stripe test-mode uses test objects only.
- Live refunds are blocked in v1.
- The AI agent must not receive Stripe secret keys.
- RefundHold cannot prevent bypass if the AI agent can call Stripe directly.
- RefundHold is not affiliated with, endorsed by, or sponsored by Stripe.

## Troubleshooting

If the demo agent API key is rejected, confirm that
`REFUNDHOLD_DEMO_AGENT_API_KEY` is set in `.env`, then rerun
`pnpm db:seed:demo`.

If the approval inbox is empty, send a refund request between $50 and $500 so
the demo policy requires human review.

If the app cannot reach the database, confirm the local Postgres service is
running with `pnpm db:up`, then rerun migrations.

If you see anything that suggests live-money use, stop. The local demo should
use demo simulation only, and live refunds are blocked in v1.
