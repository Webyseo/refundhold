# Disclaimer

RefundHold helps add approval controls and audit records around AI-proposed
Stripe refunds.

RefundHold is not legal, financial, tax, accounting, compliance, or
fraud-prevention advice. You are responsible for your own policies, controls,
regulatory obligations, refund decisions, and production readiness.

## Safety Boundary

- Demo simulation does not move money.
- Stripe test-mode uses test objects only.
- Live refunds are blocked in v1.
- The AI agent must not receive Stripe secret keys.
- Production live-money use requires a separate readiness review.

RefundHold can help enforce an approval path only when AI agents and trusted
backends are integrated through that path. RefundHold cannot prevent bypass if
an AI agent can call Stripe directly.

## Stripe Notice

RefundHold is not affiliated with, endorsed by, or sponsored by Stripe. Stripe
is a trademark of Stripe, Inc.
