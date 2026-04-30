import Link from "next/link";

import { PublicHeader } from "../../public-header";
import { DocsNavigation } from "../docs-navigation";

const prerequisites = [
  "RefundHold controlled environment is available.",
  "You have a RefundHold demo agent API key.",
  "You have access to Stripe test-mode.",
  "You can create Stripe test objects.",
  "You can access the reviewer dashboard or have an operator who can.",
  "Live Stripe keys are not used.",
  "AI support agent has no Stripe secret keys.",
];

const safetyRules = [
  "Do not use live Stripe keys.",
  "Do not give Stripe keys to the AI support agent.",
  "Do not use production customer data.",
  "Do not use live Stripe object IDs.",
  "Do not enable live refunds.",
  "Stop if any response, dashboard, or Stripe dashboard suggests live mode.",
];

const environmentRows = [
  [
    "RefundHold demo agent API key",
    "Preferred where supported: REFUNDHOLD_DEMO_AGENT_API_KEY. Legacy fallback during the naming transition: AUTHRAIL_DEMO_AGENT_API_KEY.",
    "Use a private pilot value. Do not use a Stripe key as the agent key.",
  ],
  [
    "Stripe test-mode enablement",
    "Current controlled Stripe settings still use legacy environment names such as AUTHRAIL_STRIPE_TEST_MODE_ENABLED and AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED.",
    "Use true only in the controlled test-mode environment. Do not enable live refunds.",
  ],
  [
    "Stripe test secret key",
    "Current setting: AUTHRAIL_STRIPE_TEST_SECRET_KEY.",
    "Use a Stripe test-mode secret or restricted test key only. Do not document or paste the value.",
  ],
  [
    "Stripe webhook test secret",
    "If webhook testing is explicitly in scope: AUTHRAIL_STRIPE_WEBHOOKS_ENABLED and AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET.",
    "Webhook callbacks are not a stable public pilot dependency.",
  ],
  [
    "App base URL",
    "Use the controlled pilot base URL. Local smoke scripts may use BASE_URL=http://localhost:3000.",
    "If exact values are not stable, use the controlled pilot environment provided by the RefundHold team.",
  ],
];

const happyPath = [
  "Create or select a Stripe test PaymentIntent or Charge.",
  "Create a RefundHold refund request with the demo simulation or controlled Stripe test-mode payload.",
  "Confirm the create response returns refund_request_id and needs_review.",
  "Open review_url or /app/refund-requests in the controlled reviewer environment.",
  "Approve or reject with an authorized reviewer or controlled reviewer backend.",
  "Execute only after approval through the trusted backend or RefundHold-controlled execution boundary.",
  "Verify audit evidence and confirm no live Stripe event exists.",
];

const dashboardEvidence = [
  "refund_request_id",
  "amount and currency",
  "AI reason",
  "customer/order context",
  "policy matched",
  "decision",
  "reviewer decision",
  "Stripe mode",
  "live mode: No",
  "idempotency reference if available",
  "execution outcome",
  "audit timeline",
  "no live Stripe event",
];

const retryRules = [
  "Store refund_request_id after create.",
  "Do not create a second refund request for the same customer refund event.",
  "Do not retry execute blindly.",
  "If a request times out, inspect the existing refund_request_id or reviewer dashboard before retrying.",
  "Public idempotency keys are not yet part of the pilot contract unless a future public API documents them.",
  "Production idempotency is required before live-money use.",
];

const plannedEvents = [
  "refund_request.created",
  "refund_request.needs_review",
  "refund_request.approved",
  "refund_request.rejected",
  "refund_request.executed",
  "refund_request.failed",
];

const passItems = [
  "create returns refund_request_id",
  "needs_review appears for the medium refund",
  "reviewer can approve or reject",
  "execution is recorded only in demo simulation or Stripe test-mode",
  "audit trail shows proposal, policy, reviewer decision, and outcome",
  "AI agent never receives Stripe keys",
  "no live Stripe event appears",
  "live refunds remain blocked",
];

const failItems = [
  "AI agent needs Stripe keys",
  "response lacks refund_request_id",
  "reviewer cannot find the request",
  "approve/reject auth is unclear in the controlled environment",
  "execution can happen before approval",
  "live-mode object appears in Stripe",
  "user cannot explain approval versus execution",
];

const relatedDocs = [
  ["/docs/api", "API reference"],
  ["/docs/test-mode-pilot", "Test-mode pilot contract"],
  ["/docs/pilot-acceptance", "Pilot acceptance contract"],
  ["/docs/stripe-test-mode", "Stripe test-mode setup"],
  ["/docs/prevent-bypass", "Prevent bypass"],
  ["/demo/reviewer", "Reviewer dashboard demo"],
  ["/contact", "Contact"],
];

const demoSimulationCurl = `curl -X POST <base_url>/api/v1/refund-requests \\
  -H "Authorization: Bearer <agent_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "stripe_mode": "demo_simulation",
    "amount": 42000,
    "currency": "usd",
    "reason": "AI support agent recommends refund"
  }'`;

const stripeTestModeCurl = `curl -X POST <base_url>/api/v1/refund-requests \\
  -H "Authorization: Bearer <agent_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "connector": "stripe_test",
    "action": "refund.create",
    "resource": "stripe.payment_intent",
    "parameters": {
      "payment_intent_id": "pi_test_...",
      "amount_minor": 10000,
      "reason": "requested_by_customer"
    },
    "context": {
      "source": "controlled_stripe_pilot",
      "ai_agent_reason": "Controlled Stripe test-mode refund validation.",
      "order_summary": "Test order for controlled pilot"
    }
  }'`;

const chargePayloadNote = `For Charge-based pilots, use the same current controlled pilot shape with:
{
  "resource": "stripe.charge",
  "parameters": {
    "charge_id": "ch_test_...",
    "amount_minor": 10000,
    "reason": "requested_by_customer"
  }
}`;

const createResponse = `{
  "refund_request_id": "ar_123",
  "decision": "needs_review",
  "reason": "Human approval required for refunds between $50 and $500",
  "review_url": "/app/refund-requests/ar_123"
}`;

const approveCurl = `curl -X POST <base_url>/api/v1/refund-requests/ar_123/approve \\
  -H "Content-Type: application/json" \\
  -H "X-RefundHold-Reviewer-Email: demo.reviewer@refundhold.com" \\
  -d '{
    "comment": "Approved for controlled Stripe test-mode pilot."
  }'`;

const approveResponse = `{
  "refund_request_id": "ar_123",
  "status": "approved",
  "decision": "approved",
  "outcome": "approved",
  "review_url": "/app/refund-requests/ar_123",
  "message": "Refund approved."
}`;

const rejectCurl = `curl -X POST <base_url>/api/v1/refund-requests/ar_123/reject \\
  -H "Content-Type: application/json" \\
  -H "X-RefundHold-Reviewer-Email: demo.reviewer@refundhold.com" \\
  -d '{
    "comment": "Rejected during controlled pilot review."
  }'`;

const rejectResponse = `{
  "refund_request_id": "ar_123",
  "status": "rejected",
  "decision": "rejected",
  "outcome": "rejected",
  "review_url": "/app/refund-requests/ar_123",
  "message": "Refund rejected."
}`;

const executeCurl = `curl -X POST <base_url>/api/v1/refund-requests/ar_123/execute \\
  -H "Content-Type: application/json" \\
  -H "X-RefundHold-Reviewer-Email: demo.reviewer@refundhold.com" \\
  -d '{
    "metadata": {
      "source": "controlled_stripe_pilot"
    }
  }'`;

const demoExecutionResponse = `{
  "refund_request_id": "ar_123",
  "status": "executed",
  "outcome": "executed",
  "review_url": "/app/refund-requests/ar_123",
  "message": "Demo execution recorded."
}`;

const stripeExecutionResponse = `{
  "refund_request_id": "ar_123",
  "status": "executed",
  "outcome": "executed",
  "review_url": "/app/refund-requests/ar_123",
  "message": "Stripe test-mode refund completed."
}`;

const errorExamples = [
  {
    title: "missing API key",
    status: "401",
    body: `{
  "error": "unauthorized",
  "message": "Authorization bearer token is required."
}`,
    agent: "Stop. Do not guess credentials.",
    operator: "Check the configured RefundHold agent API key.",
  },
  {
    title: "invalid API key",
    status: "401",
    body: `{
  "error": "unauthorized",
  "message": "API key is invalid."
}`,
    agent: "Stop and escalate.",
    operator: "Rotate or configure the correct RefundHold key. Do not substitute a Stripe key.",
  },
  {
    title: "invalid payload",
    status: "400",
    body: `{
  "error": "invalid_payload",
  "message": "Request body is invalid."
}`,
    agent: "Do not invent fields.",
    operator: "Compare the request to this runbook and the API reference.",
  },
  {
    title: "not found",
    status: "404",
    body: `{
  "error": "not_found",
  "refund_request_id": "ar_missing",
  "message": "Refund request was not found."
}`,
    agent: "Do not create a replacement automatically.",
    operator: "Inspect the stored refund_request_id and dashboard state.",
  },
  {
    title: "invalid state transition or already reviewed",
    status: "409",
    body: `{
  "error": "already_reviewed",
  "refund_request_id": "ar_123",
  "message": "Refund request is already approved."
}`,
    agent: "Use the existing decision.",
    operator: "Inspect the request state before any next step.",
  },
  {
    title: "execution not allowed",
    status: "409",
    body: `{
  "error": "not_executable",
  "refund_request_id": "ar_123",
  "message": "Refund request must be approved before execution."
}`,
    agent: "Do not call Stripe.",
    operator: "Approve first, or resolve the rejected, blocked, failed, or already executed state.",
  },
  {
    title: "live refunds blocked",
    status: "409 or 500",
    body: `{
  "error": "not_executable",
  "refund_request_id": "ar_123",
  "message": "Live-mode Stripe objects or live execution settings are rejected for v1."
}`,
    agent: "Stop. Do not retry live-money operations.",
    operator: "Keep live refunds blocked and review production readiness separately.",
  },
  {
    title: "Stripe test object missing or unsupported",
    status: "400 or 500",
    body: `{
  "error": "invalid_payload",
  "message": "Stripe refund proposals require payment_intent_id or charge_id."
}`,
    agent: "Do not switch to a live Stripe object.",
    operator: "Provide a supported Stripe test PaymentIntent or Charge. Examples may be hardened during pilot.",
  },
];

export default function TestModeRunbookPage() {
  return (
    <main className="docs-page min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold runbook
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Exact test-mode runbook
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            A step-by-step script for running a controlled RefundHold pilot with
            Stripe test objects. Live refunds are blocked in v1.
          </p>
        </div>

        <DocsNavigation currentPath="/docs/test-mode-runbook" />

        <div className="mt-10 rounded-lg border border-amber-300/50 bg-amber-300/10 p-5">
          <p className="text-sm font-semibold text-amber-200">
            Pilot safety rule
          </p>
          <Checklist items={safetyRules} />
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <RunbookSection title="What this runbook is">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  This is the exact pilot script for a controlled Stripe
                  test-mode run. It is meant for a founder-led or assisted
                  technical pilot where a CTO, technical lead, or operations
                  owner wants to test the RefundHold approval boundary.
                </p>
                <p>
                  This is not a production live-money guide. It assumes live
                  refunds remain blocked and the AI support agent never receives
                  Stripe secret keys.
                </p>
                <p>
                  For this controlled pilot, live refunds are blocked in v1.
                </p>
              </div>
            </RunbookSection>

            <RunbookSection title="Prerequisites">
              <Checklist items={prerequisites} />
            </RunbookSection>

            <RunbookSection title="Environment and settings">
              <p className="text-sm leading-6 text-zinc-300">
                Use categories and private values, not real secrets. Where exact
                values are not stable, use the controlled pilot environment
                provided by the RefundHold team.
              </p>
              <ThreeColumnTable
                columns={["Category", "Current setting", "Pilot note"]}
                rows={environmentRows}
              />
            </RunbookSection>

            <RunbookSection title="Exact happy path">
              <OrderedList items={happyPath} />
            </RunbookSection>

            <RunbookSection title="Create a Stripe test object">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  Use Stripe test-mode only. Create or select a test
                  PaymentIntent or Charge supported by the current controlled
                  pilot.
                </p>
                <p>
                  Keep the test object ID available for the refund proposal.
                  The current controlled Stripe test-mode payload uses
                  connector: stripe_test with resource stripe.payment_intent or
                  stripe.charge. Do not send stripe_mode: stripe_test because
                  the public shortcut currently supports stripe_mode:
                  demo_simulation only.
                </p>
              </div>
            </RunbookSection>

            <RunbookSection title="Create the RefundHold refund request">
              <div className="space-y-5">
                <PathBlock
                  body="This path records the RefundHold decision and demo evidence without calling Stripe."
                  title="Demo simulation path"
                  value={demoSimulationCurl}
                />
                <PathBlock
                  body="This path is the current controlled pilot shape for Stripe test-mode. It uses the compatibility payload honestly because stripe_mode: stripe_test is not the implemented public shortcut."
                  title="Controlled Stripe test-mode path"
                  value={stripeTestModeCurl}
                />
                <CodeBlock value={chargePayloadNote} />
                <p className="text-sm leading-6 text-zinc-300">
                  Required create headers are Authorization: Bearer
                  &lt;agent_api_key&gt; and Content-Type: application/json. The
                  AI support agent receives the RefundHold agent key, not a
                  Stripe key.
                </p>
              </div>
            </RunbookSection>

            <RunbookSection title="Expected create response">
              <p className="text-sm leading-6 text-zinc-300">
                For the pilot, use an amount or policy match that returns
                needs_review.
              </p>
              <CodeBlock value={createResponse} />
              <Checklist
                items={[
                  "Store refund_request_id.",
                  "Do not create a second refund request for the same customer event.",
                  "Do not call Stripe from the AI support agent.",
                ]}
              />
            </RunbookSection>

            <RunbookSection title="Open reviewer dashboard">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  Open review_url if available. Otherwise open
                  /app/refund-requests in the controlled reviewer environment.
                </p>
                <p>
                  If private demo access is enabled, the tester needs the
                  approved private demo access path. Do not bypass the gate.
                </p>
                <p>
                  The reviewer checks AI reason, customer/order context, policy,
                  mode, evidence, and audit trail before approving or rejecting.
                </p>
              </div>
            </RunbookSection>

            <RunbookSection title="Approve or reject">
              <div className="space-y-5">
                <p className="text-sm leading-6 text-zinc-300">
                  These endpoints are called by an authorized human reviewer,
                  trusted reviewer backend, or controlled reviewer session. The
                  agent API key does not authorize human review actions. In an
                  auth-disabled local demo, the existing route can use
                  X-RefundHold-Reviewer-Email to resolve the demo reviewer. In
                  a controlled pilot environment, reviewer auth/session handling
                  is provided by the environment.
                </p>
                <div className="grid gap-3 text-sm leading-6 text-zinc-300 lg:grid-cols-2">
                  <p className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-emerald-200">
                    POST /api/v1/refund-requests/[id]/approve
                  </p>
                  <p className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-emerald-200">
                    POST /api/v1/refund-requests/[id]/reject
                  </p>
                </div>
                <EndpointExample
                  description="Approval records the human decision. Approval is not the same as Stripe execution."
                  expected={approveResponse}
                  request={approveCurl}
                  title="Approve"
                />
                <EndpointExample
                  description="Rejection records the human decision and blocks automatic continuation."
                  expected={rejectResponse}
                  request={rejectCurl}
                  title="Reject"
                />
              </div>
            </RunbookSection>

            <RunbookSection title="Execute or record execution">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  Execute only after approval and only through the trusted
                  backend or RefundHold-controlled execution boundary.
                </p>
                <p>
                  Demo simulation records execution evidence without Stripe
                  calls. Controlled Stripe test-mode uses test objects only when
                  configured. Live refunds are blocked in v1.
                </p>
              </div>
              <p className="mt-5 rounded-md border border-zinc-800 bg-zinc-950/60 p-3 font-mono text-sm text-emerald-200">
                POST /api/v1/refund-requests/[id]/execute
              </p>
              <CodeBlock value={executeCurl} />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <CodeExample
                  title="Demo simulation response"
                  value={demoExecutionResponse}
                />
                <CodeExample
                  title="Stripe test-mode response"
                  value={stripeExecutionResponse}
                />
              </div>
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                These responses are pilot evidence, not a production live
                execution readiness claim.
              </p>
            </RunbookSection>

            <RunbookSection title="Expected dashboard evidence">
              <Checklist items={dashboardEvidence} />
            </RunbookSection>

            <RunbookSection title="Expected Stripe test dashboard evidence">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  If test-mode execution is configured, verify the event or
                  object appears only in Stripe test-mode.
                </p>
                <p>No live Stripe dashboard event should appear.</p>
                <p>
                  If the pilot is demo simulation only, the Stripe dashboard
                  should show no refund event because no Stripe call is made.
                </p>
                <p>Stop the pilot if any live-mode event appears.</p>
              </div>
            </RunbookSection>

            <RunbookSection title="Retry and idempotency rule for the pilot">
              <Checklist items={retryRules} />
            </RunbookSection>

            <RunbookSection title="Webhook/callback rule for the pilot">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  Webhooks are not a stable public callback contract yet unless
                  already implemented in a controlled environment.
                </p>
                <p>
                  For this pilot, verification uses API responses, review_url,
                  reviewer dashboard, and documented audit evidence.
                </p>
                <p>
                  Planned callback events are architecture direction, not a
                  pilot dependency.
                </p>
              </div>
              <Checklist items={plannedEvents} />
            </RunbookSection>

            <RunbookSection title="Error object examples">
              <p className="text-sm leading-6 text-zinc-300">
                These examples follow the current public API and route tests.
                Some failure messages may be hardened during pilot setup, but
                the safe operator behavior should not change.
              </p>
              <div className="mt-5 grid gap-4">
                {errorExamples.map((example) => (
                  <ErrorExample key={example.title} {...example} />
                ))}
              </div>
            </RunbookSection>

            <RunbookSection title="Pass/fail checklist">
              <div className="grid gap-5 lg:grid-cols-2">
                <ChecklistPanel items={passItems} title="Pass if" />
                <ChecklistPanel items={failItems} title="Fail if" />
              </div>
            </RunbookSection>

            <RunbookSection title="Related docs">
              <div className="grid gap-3 sm:grid-cols-2">
                {relatedDocs.map(([href, label]) => (
                  <CtaLink href={href} key={href}>
                    {label}
                  </CtaLink>
                ))}
              </div>
            </RunbookSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-xl font-semibold text-zinc-50">
              Pilot script
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              Use this page when a reviewer needs one executable happy path
              instead of stitching together the API reference, pilot contract,
              Stripe test-mode setup, and bypass docs.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              {relatedDocs.map(([href, label]) => (
                <CtaLink href={href} key={href}>
                  {label}
                </CtaLink>
              ))}
            </div>
            <p className="mt-6 border-t border-zinc-800 pt-5 text-xs leading-5 text-zinc-300">
              RefundHold is not affiliated with, endorsed by, or sponsored by
              Stripe. Stripe is a trademark of Stripe, Inc.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function RunbookSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-xl font-semibold text-zinc-50">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li className="flex gap-3 text-sm leading-6 text-zinc-300" key={item}>
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function OrderedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, index) => (
        <li className="flex gap-3 text-sm text-zinc-300" key={item}>
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-semibold text-zinc-950">
            {index + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function ThreeColumnTable({
  columns,
  rows,
}: {
  columns: [string, string, string];
  rows: string[][];
}) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-100">
            {columns.map((column) => (
              <th className="py-3 pr-4 font-semibold" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([first, second, third]) => (
            <tr className="border-b border-zinc-800 last:border-b-0" key={first}>
              <td className="py-3 pr-4 font-semibold text-emerald-200">
                {first}
              </td>
              <td className="py-3 pr-4 text-zinc-300">{second}</td>
              <td className="py-3 text-zinc-300">{third}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PathBlock({
  body,
  title,
  value,
}: {
  body: string;
  title: string;
  value: string;
}) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
      <h3 className="text-base font-semibold text-zinc-50">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{body}</p>
      <CodeBlock value={value} />
    </section>
  );
}

function EndpointExample({
  description,
  expected,
  request,
  title,
}: {
  description: string;
  expected: string;
  request: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
      <h3 className="text-base font-semibold text-zinc-50">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{description}</p>
      <CodeExample title="Request" value={request} />
      <CodeExample title="Expected response" value={expected} />
    </section>
  );
}

function ErrorExample({
  agent,
  body,
  operator,
  status,
  title,
}: {
  agent: string;
  body: string;
  operator: string;
  status: string;
  title: string;
}) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-base font-semibold text-zinc-50">{title}</h3>
        <p className="font-mono text-sm text-emerald-200">status {status}</p>
      </div>
      <CodeBlock value={body} />
      <dl className="mt-4 grid gap-3 text-sm leading-6 lg:grid-cols-2">
        <div>
          <dt className="font-semibold text-zinc-50">Agent should do</dt>
          <dd className="mt-1 text-zinc-300">{agent}</dd>
        </div>
        <div>
          <dt className="font-semibold text-zinc-50">Operator should do</dt>
          <dd className="mt-1 text-zinc-300">{operator}</dd>
        </div>
      </dl>
    </section>
  );
}

function ChecklistPanel({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/70 p-4">
      <h3 className="text-base font-semibold text-zinc-50">{title}</h3>
      <Checklist items={items} />
    </section>
  );
}

function CodeExample({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="mt-4 text-sm font-semibold text-zinc-50">{title}</p>
      <CodeBlock value={value} />
    </div>
  );
}

function CodeBlock({ value }: { value: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">
      <code>{value}</code>
    </pre>
  );
}

function CtaLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
      href={href}
    >
      {children}
    </Link>
  );
}
