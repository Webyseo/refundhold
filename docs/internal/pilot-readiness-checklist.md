# RefundHold Pilot Readiness Checklist

This checklist is for controlled demo simulation and Stripe test-mode pilots. It is not a live-money production readiness checklist.

## Product clarity check

- [ ] Home explains RefundHold in under 10 seconds.
- [ ] Primary CTA is Try the refund demo.
- [ ] Public demo requires no login, password, or API key.
- [ ] Demo shows AI refund proposal, policy match, human decision, and audit trail.
- [ ] Demo clearly says no real money moved.
- [ ] Quickstart explains `/api/v1/refund-requests`.
- [ ] Reviewer app uses `/app/refund-requests` as the visible route.
- [ ] Public pages do not present RefundHold as a generic AI action platform.

## Activation event check

Expected activation events:

- [ ] `landing_viewed`
- [ ] `landing_demo_cta_clicked`
- [ ] `demo_started`
- [ ] `demo_policy_matched`
- [ ] `demo_review_opened`
- [ ] `demo_refund_approved`
- [ ] `demo_refund_rejected`
- [ ] `demo_audit_viewed`
- [ ] `quickstart_viewed`
- [ ] `api_curl_copied`

For early pilots, review server logs for activation events and look for drop-off between `demo_started` and `demo_audit_viewed`.

Do not add new analytics implementation as part of this checklist.

## Manual smoke test

Verify these routes:

- [ ] `/`
- [ ] `/demo`
- [ ] `/docs/quickstart`
- [ ] `/app`
- [ ] `/app/onboarding`
- [ ] `/app/refund-requests`
- [ ] `/app/stripe`
- [ ] `/contact`
- [ ] `/security`
- [ ] `/privacy`
- [ ] `/terms`

If the private demo gate is enabled, `/app` routes may redirect to `/demo-access`. That is expected unless the tester has the private demo password.

## Stripe test-mode readiness

- [ ] Stripe test-mode page exists.
- [ ] Demo simulation and Stripe test-mode are clearly separated.
- [ ] Live refunds are blocked in v1.
- [ ] Restricted test keys are used for test-mode pilots.
- [ ] Webhook test settings are understood before testing webhook flows.
- [ ] No live Stripe secrets are used.
- [ ] No production customer data is used.
- [ ] Test refund request can be created through `/api/v1/refund-requests`.
- [ ] Held refund can be reviewed through `/app/refund-requests`.
- [ ] Approve, reject, and execute aliases exist.

## Pilot trust pages

- [ ] `/contact` exists and provides a pilot request path.
- [ ] `/security` states live refunds are blocked in v1.
- [ ] `/privacy` is a plain-language placeholder and does not claim final legal review.
- [ ] `/terms` is a plain-language placeholder and does not claim production readiness.
- [ ] Stripe disclaimer exists where appropriate.

## Go / No-go criteria

### Go for controlled test-mode pilot if:

- [ ] Public demo can be completed.
- [ ] Quickstart is understandable.
- [ ] Test-mode safety boundary is clear.
- [ ] Live refunds remain blocked.
- [ ] Contact path works.
- [ ] Security, privacy, and terms placeholders are present.
- [ ] No visible legacy AuthRail or generic AI action positioning appears in public pages.

### No-go if:

- [ ] Demo flow breaks.
- [ ] Live-money wording is ambiguous.
- [ ] Public pages imply production readiness.
- [ ] Stripe test-mode and live mode are confused.
- [ ] API aliases fail.
- [ ] Reviewer dashboard does not show refund review language.
- [ ] Activation events are not being logged.
- [ ] Any page suggests RefundHold is Stripe-approved or prevents all fraud.

## Known limitations before production

- Live refunds are blocked in v1.
- Production authentication review is still required.
- RBAC review is still required.
- Restricted Stripe key setup needs a final runbook.
- Webhook reconciliation needs review before production.
- Audit export is planned but not production-ready unless already implemented.
- Final legal review is still required for privacy, terms, and DPA.
- Backup and rollback process must be verified for production.
- Explicit live-mode approval is required before any live refunds.

## Recommended next product step

After this checklist exists, the next product step should be to run one controlled test-mode pilot rehearsal end-to-end and capture what confuses the user before adding pricing or more features.

For the first real external tester, use the [RefundHold Demo Simulation Pilot Test Kit](./demo-simulation-pilot-test-kit.md).
