# RefundHold

Approval inbox for AI-generated Stripe refunds.

RefundHold checks refund proposals from AI support agents before they reach
Stripe. Safe refunds can pass. Risky refunds wait for human approval. Every
decision is logged.

## What it does

RefundHold checks refund proposals from AI support agents before they reach
Stripe.

Small refunds can pass.

Risky refunds wait for human approval.

Every decision is logged in an audit trail.

## Demo policy

- Under $50 → allowed
- $50-$500 → needs human review
- Over $500 → blocked

## Run locally

```bash
pnpm install
cp .env.example .env
# Set REFUNDHOLD_DEMO_AGENT_API_KEY in .env before seeding.
pnpm db:up
pnpm db:migrate
pnpm db:seed:demo
pnpm dev
```

Open http://localhost:3000/demo

## Demo agent API key

For local demo simulation, configure a demo agent API key in `.env` before
running the demo seed.

- Use `REFUNDHOLD_DEMO_AGENT_API_KEY` as the preferred variable.
- Use a private local value in the demo format `ar_demo_<prefix>_<secret>`.
- Run `pnpm db:seed:demo` after setting or changing the key so RefundHold stores
  the matching hash.
- Use that same value as `Bearer <agent_api_key>` when calling
  `/api/v1/refund-requests`.
- Never use a live Stripe secret as the agent API key.
- Never commit real API keys.

## Send a refund request

Public endpoint: `POST /api/v1/refund-requests`.

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

Decision endpoints:

- Approve: `POST /api/v1/refund-requests/[id]/approve`
- Reject: `POST /api/v1/refund-requests/[id]/reject`
- Execute or record demo execution: `POST /api/v1/refund-requests/[id]/execute`

## Safety

- Demo simulation does not move money.
- Stripe test-mode uses test objects only.
- Live refunds are blocked in v1.
- The AI agent must not receive Stripe secret keys.
- RefundHold is not affiliated with, endorsed by, or sponsored by Stripe.

## Open-source status

RefundHold is preparing for a future open-core release, but this repository is
not ready to publish publicly yet.

- [Open-source boundary](docs/open-source.md)
- [Public release checklist](docs/public-release-checklist.md)
- [Local demo guide](docs/local-demo.md)
- [Security policy](SECURITY.md)
- [Disclaimer](DISCLAIMER.md)
- [Contributing guide](CONTRIBUTING.md)

For the pilot-ready API reference, see `/docs/api`.
For the exact controlled test-mode runbook, see `/docs/test-mode-runbook`.
For pilot acceptance criteria, see `/docs/pilot-acceptance`.
For the controlled test-mode pilot contract, see `/docs/test-mode-pilot`.
For a controlled technical pilot, see `/docs/stripe-test-mode`.
For bypass-prevention architecture, see `/docs/prevent-bypass`.

## Internal docs

- [Internal operational docs index](docs/internal/README.md)
