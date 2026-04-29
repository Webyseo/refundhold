# RefundHold Agent Instructions

## Naming Contract

RefundHold is the correct visible product and demo name.

The repository directory, package name, environment variable prefixes, Prisma
enum names, and some TypeScript type names still use `authrail` or `AuthRail`
from the original internal platform thesis. Do not rename those internal
identifiers unless the user explicitly asks for a focused internal-positioning
pass. UI copy, README copy, and handoff documentation should use RefundHold as
the product name.

## Product Thesis

RefundHold is an approval and execution-control layer for Stripe refunds
proposed by AI support agents.

RefundHold is not IAM, SSO, Auth0, Okta, or a generic identity provider. It does
not replace an organization's existing identity, access management,
authentication, or authorization systems. RefundHold sits between AI support
agents and Stripe refund execution to evaluate policy, require human approval
when needed, execute only after approval/control, and record an immutable audit
trail.

The core product flow is:

1. An AI support agent proposes a Stripe refund.
2. RefundHold evaluates organization refund policies.
3. RefundHold returns `allow`, `deny`, or `approval_required`.
4. If approval is required, a human reviews the refund.
5. If approved, RefundHold executes the refund path or emits an execution grant.
6. Every step is recorded in an immutable audit trail.

## Product Priorities

1. Approval control for AI-initiated Stripe refunds.
2. Policy evaluation before execution.
3. Human review for refunds that require approval.
4. Execution paths or grants that are explicit, scoped, and auditable.
5. Immutable audit records for proposal, decision, review, approval, denial,
   execution, and grant issuance.
6. Clear integration points for AI support agents, backend tools, Stripe, and
   future execution environments.

## Things To Avoid

- Do not position RefundHold as IAM, SSO, Auth0, Okta, or a generic identity provider.
- Do not build login, user-directory, SAML, SCIM, OAuth-provider, or IdP replacement features unless explicitly required for the approval-control product.
- Do not make RefundHold a generic workflow tool.
- Do not treat approval as a notification-only feature. Approval must control execution.
- Do not allow sensitive actions to execute before policy evaluation.
- Do not create audit records that can be edited, deleted, or rewritten as part of normal product behavior.
- Do not hide policy decisions behind vague states. Use clear decision outcomes.
- Do not couple the product to one AI-agent framework unless an adapter boundary is preserved.
- Do not rename RefundHold back to AuthRail in visible product copy.

## Technical Principles

- Model the proposed action as a first-class object with actor, target, operation, payload summary, risk context, policy result, and execution state.
- Keep policy evaluation deterministic and explainable.
- Treat `allow`, `deny`, and `approval_required` as explicit product states.
- Treat human approval as a security boundary, not as a UI convenience.
- Make execution grants short-lived, scoped, traceable, and bound to the approved action.
- Record audit events append-only. Prefer immutable event records over mutable status history.
- Separate proposal, policy decision, approval review, grant issuance, and execution concerns.
- Design APIs for AI agents and backend systems first. UI should expose and control the same underlying state.
- Fail closed for sensitive actions when policy, approval, audit, or grant state is ambiguous.
- Keep integrations narrow: RefundHold controls whether and how a refund may
  execute; it does not own the entire external system.

## Definition Of Done

A change is done only when:

- It preserves the product thesis that RefundHold is an approval and execution-control layer for AI-initiated Stripe refunds.
- It does not present RefundHold as IAM, SSO, Auth0, Okta, or a generic identity provider.
- Sensitive actions cannot bypass policy evaluation.
- Actions that require approval cannot execute without an approved review or valid execution grant.
- Decisions are represented as `allow`, `deny`, or `approval_required`.
- Audit events exist for all meaningful steps in the action lifecycle.
- Audit records are treated as immutable.
- New behavior has clear failure states and fails closed for approval-control paths.
- The implementation remains understandable, scoped, and aligned with the core product flow.
