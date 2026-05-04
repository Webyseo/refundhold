# @refundhold/core

`@refundhold/core` is an early private package skeleton for the future
RefundHold open-core boundary. It is not published and is not wired into the
app runtime yet.

RefundHold helps teams stop AI agents from refunding Stripe money without
approval. This package currently contains public refund-request contracts and a
deterministic demo policy evaluator for AI-proposed Stripe refunds.

Safety boundary:

- Demo simulation does not move money.
- Stripe test-mode uses test objects only.
- Live refunds are blocked in v1.
- The AI agent must not receive Stripe secret keys.
- This package is not a production live-money readiness claim.
