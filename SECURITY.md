# Security Policy

RefundHold is an approval inbox for AI-generated Stripe refunds. Its public
safety boundary is narrow: stop AI agents from refunding Stripe money without
approval.

## Supported Security Posture

This repository is preparing for a future open-core release. The supported
security posture for the public surface is:

- Demo simulation only for local demos. Demo simulation does not move money.
- Stripe test-mode only for controlled test pilots. Stripe test-mode uses test
  objects only.
- Live refunds are blocked in v1.
- The AI agent must not receive Stripe secret keys.

Production live-money use requires a separate readiness review and is not part
of the current public release posture.

## Reporting A Security Issue

Send security reports to security@refundhold.com.

Do not include secrets in reports. Do not paste real Stripe keys, tokens,
passwords, private URLs, live customer data, production payment objects, or live
refund flows into GitHub issues, pull requests, screenshots, logs, or examples.

Use placeholder values instead, such as:

- `<agent_api_key>`
- `<stripe_test_object_id>`
- `<test_customer_id>`
- `<example.local>`

If a report needs sensitive details, email security@refundhold.com first and
wait for a safer handling path.

## Scope For Reports

Good security reports include:

- A concise description of the issue.
- Steps to reproduce using demo simulation or Stripe test-mode only.
- The expected result and actual result.
- Whether the issue could affect approval controls, audit trail integrity, or
  live-refund blocking.

Do not attempt to reproduce issues with live Stripe keys, live customer data,
production payment objects, or live refund flows.

## Stripe Notice

RefundHold is not affiliated with, endorsed by, or sponsored by Stripe. Stripe
is a trademark of Stripe, Inc.
