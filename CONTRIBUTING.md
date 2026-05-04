# Contributing

RefundHold is an approval inbox for AI-generated Stripe refunds. Keep changes
focused on the core message: stop AI agents from refunding Stripe money without
approval.

## Local Setup

Use the existing README flow:

```bash
pnpm install
cp .env.example .env
# Set REFUNDHOLD_DEMO_AGENT_API_KEY in .env before seeding.
pnpm db:up
pnpm db:migrate
pnpm db:seed:demo
pnpm dev
```

Open `http://localhost:3000/demo` for the public demo simulation.

## Checks Before Submitting Changes

Run these checks before opening a pull request:

```bash
pnpm prisma generate
pnpm prisma validate
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

## Product Contribution Rules

- Do not reintroduce legacy public language.
- Do not add live-refund claims.
- Do not position RefundHold as IAM, SSO, full compliance, fraud prevention, or
  Stripe-approved.
- Keep the product focused on AI-proposed Stripe refunds.
- Keep demo simulation, Stripe test-mode, and live refunds clearly separated.
- Preserve the message: stop AI agents from refunding Stripe money without
  approval.

## Security Contribution Rules

- Never commit secrets.
- Never use live Stripe keys in tests, fixtures, docs, or examples.
- Never give Stripe secret keys to the AI agent.
- Use placeholder values in documentation and reports.
- Keep live refunds blocked in v1.

## Pull Request Expectations

- Keep changes small and reviewable.
- Add tests when changing behavior or public documentation.
- Add public docs language tests when adding public pages.
- Explain whether the change affects demo simulation, Stripe test-mode, or
  live-refund blocking.
- Call out any change that affects approval controls, audit trail evidence, or
  refund request execution state.
