import Link from "next/link";

import { PublicHeader } from "../../public-header";
import { DocsNavigation } from "../docs-navigation";

const coverageItems = [
  "This contract is for controlled Stripe test-mode pilots.",
  "It covers the pilot flow from refund proposal to review, approval or rejection, execution recording, and audit trail.",
  "It does not prove production live-money readiness.",
  "Live refunds are blocked in v1.",
  "Demo simulation and Stripe test-mode are separate modes.",
];

const actorRows = [
  [
    "AI support agent",
    "Collects refund context and sends refund proposals to RefundHold. It must not hold Stripe secret keys.",
  ],
  [
    "RefundHold API",
    "Receives refund proposals, evaluates policy, and returns allowed, needs_review, or blocked.",
  ],
  [
    "RefundHold reviewer dashboard",
    "Shows requests that need human review, with AI reason, order context, policy match, evidence, and audit trail.",
  ],
  [
    "Human reviewer",
    "Approves or rejects a refund request. The decision becomes part of the audit trail.",
  ],
  [
    "Trusted backend or RefundHold-controlled execution boundary",
    "Holds Stripe test-mode credentials and verifies the RefundHold state before any controlled execution path.",
  ],
  [
    "Stripe test-mode only",
    "Uses Stripe test objects. Live Stripe execution is not part of this pilot contract.",
  ],
];

const architectureRules = [
  "The AI support agent must not hold Stripe secret keys.",
  "The AI support agent sends refund proposals to RefundHold.",
  "RefundHold evaluates policy and returns a decision.",
  "If human approval is required, the agent stops and tells the customer the refund is waiting for review.",
  "Execution must happen only through a trusted backend or RefundHold-controlled boundary after approval.",
  "Live Stripe execution is not part of this pilot contract.",
];

const pilotFlow = [
  {
    title: "Step 1: Agent proposes refund",
    body: [
      "Endpoint: POST /api/v1/refund-requests.",
      "Expected result: allowed, needs_review, or blocked.",
      "For the core pilot, use a refund amount that returns needs_review.",
    ],
  },
  {
    title: "Step 2: RefundHold evaluates policy",
    body: [
      "Policy determines whether the refund can continue, must wait for review, or is blocked.",
      "The agent does not enforce policy itself.",
    ],
  },
  {
    title: "Step 3: Human review",
    body: [
      "Reviewer opens /app/refund-requests or the private reviewer dashboard.",
      "Reviewer checks AI reason, order context, policy match, evidence, and audit trail.",
      "Reviewer approves or rejects.",
    ],
  },
  {
    title: "Step 4: Approval or rejection",
    body: [
      "Approve endpoint: POST /api/v1/refund-requests/[id]/approve.",
      "Reject endpoint: POST /api/v1/refund-requests/[id]/reject.",
      "Approval records a human decision.",
      "Rejection blocks automatic continuation.",
    ],
  },
  {
    title: "Step 5: Execution or demo/test execution record",
    body: [
      "Execute endpoint: POST /api/v1/refund-requests/[id]/execute.",
      "Demo simulation records execution evidence without Stripe calls.",
      "Stripe test-mode must use Stripe test objects only.",
      "Live refunds remain blocked.",
    ],
  },
  {
    title: "Step 6: Audit trail",
    body: [
      "RefundHold records proposal, policy result, reviewer decision, execution outcome, and safety evidence where available.",
    ],
  },
];

const stateRows = [
  [
    "allowed",
    "Policy allows the proposal.",
    "The agent still must not call Stripe directly unless a trusted backend path explicitly allows it. In v1 live refunds are blocked.",
  ],
  [
    "needs_review",
    "Human approval is required.",
    "Agent should tell the customer the refund is waiting for human review. Agent should not retry Stripe or promise completion.",
  ],
  [
    "blocked",
    "Refund cannot continue automatically.",
    "Agent should not retry or bypass RefundHold. Agent should escalate or provide a safe refusal message.",
  ],
  [
    "approved",
    "Human reviewer approved the request.",
    "Approval is not the same as live execution.",
  ],
  [
    "rejected",
    "Human reviewer rejected the request.",
    "Refund cannot continue automatically.",
  ],
  [
    "executed",
    "Demo or test-mode execution has been recorded or completed according to the controlled mode.",
    "In demo simulation, this does not mean money moved.",
  ],
  [
    "failed",
    "Execution or test path failed.",
    "Human/operator review is required.",
  ],
];

const agentRows = [
  [
    "allowed",
    "Do not call Stripe directly. Continue only through the configured trusted backend or controlled execution path. Do not promise refund completion unless execution is confirmed.",
  ],
  [
    "needs_review",
    "Tell the customer the refund is waiting for human review. Store refund_request_id. Stop autonomous execution. Do not keep the agent in an uncontrolled loop.",
  ],
  [
    "blocked",
    "Do not retry automatically. Do not call Stripe. Escalate or respond with a safe message.",
  ],
  [
    "error",
    "Escalate to human/operator. Do not guess. Do not retry live-money operations blindly.",
  ],
];

const backendItems = [
  "hold Stripe test-mode credentials, not the AI agent",
  "verify the RefundHold decision before execution",
  "respect the refund_request_id",
  "respect amount, currency, mode, and approval outcome",
  "record execution outcome",
  "avoid duplicate execution",
  "log enough evidence for audit trail",
  "keep live refunds blocked unless explicit production readiness exists",
];

const approvalExecutionItems = [
  "Approval records a human decision.",
  "Execution records or performs the controlled follow-up action.",
  "Approval does not mean the AI agent can call Stripe.",
  "Approval should be treated as a narrow permission for one refund request.",
  "The execution path must verify that approval before doing anything with Stripe test objects.",
  "In demo simulation, execution is only a recorded event.",
  "During pilot hardening, approval should behave like a narrow grant tied to refund_request_id, amount, currency, mode, reviewer, timestamp, and outcome.",
];

const retryItems = [
  "Idempotency is a required production-readiness topic.",
  "Do not retry live-money operations blindly.",
  "Demo simulation is safe for learning but can create duplicate proposals if the same request is sent repeatedly unless an idempotency field is supported.",
  "For controlled test-mode pilots, retry behavior must be agreed before execution testing.",
  "The safe pilot practice is to store refund_request_id and avoid creating a second refund request for the same customer event.",
  "If execution returns already_reviewed, invalid state, conflict, or similar state errors, the operator should inspect the existing refund_request_id instead of retrying blindly.",
  "Public idempotency keys are not yet part of the pilot contract.",
];

const waitingItems = [
  "The AI agent should not wait in a long-running loop.",
  "The agent should inform the customer that the refund is under human review.",
  "The business should track refund_request_id.",
  "Operators use the reviewer dashboard to approve or reject.",
  "For this pilot, status changes are inspected through the dashboard and API responses.",
  "Webhook/polling production behavior is not part of the current stable contract unless implemented.",
];

const plannedEvents = [
  "refund_request.created",
  "refund_request.needs_review",
  "refund_request.approved",
  "refund_request.rejected",
  "refund_request.executed",
  "refund_request.failed",
];

const callbackCandidate = `Example only. Not a stable implemented webhook contract yet.
{
  "event": "refund_request.needs_review",
  "refund_request_id": "ar_123",
  "decision": "needs_review",
  "status": "needs_review",
  "review_url": "/app/refund-requests/ar_123",
  "mode": "demo_simulation",
  "created_at": "2026-04-30T00:00:00.000Z"
}`;

const errorRows = [
  [
    "missing API key",
    "RefundHold did not receive a usable agent API key.",
    "Do not guess credentials. Escalate to the operator.",
    "Check the configured RefundHold agent key and API reference.",
  ],
  [
    "invalid API key",
    "The provided agent key is not accepted.",
    "Stop the flow and escalate.",
    "Rotate or configure the correct RefundHold key. Do not substitute a Stripe key.",
  ],
  [
    "invalid payload",
    "The proposal shape is missing required fields or uses unsupported values.",
    "Ask for operator review rather than inventing fields.",
    "Compare the request to the API reference and resend only after correction.",
  ],
  [
    "refund request not found",
    "The refund_request_id is missing or not available to the caller.",
    "Do not create a replacement request automatically.",
    "Inspect the stored refund_request_id and dashboard state.",
  ],
  [
    "invalid state transition",
    "The requested review or execution step does not match the current state.",
    "Stop autonomous retries.",
    "Inspect the existing request and audit trail.",
  ],
  [
    "already reviewed",
    "A reviewer has already approved or rejected the request.",
    "Use the existing decision; do not ask for another automatic review.",
    "Continue only if the current state allows a controlled execution step.",
  ],
  [
    "execution not allowed",
    "The request is not approved, is rejected or blocked, or has already executed.",
    "Do not call Stripe.",
    "Review the request state and resolve manually.",
  ],
  [
    "Stripe test object missing",
    "The referenced Stripe test object is unavailable or not valid for the pilot.",
    "Do not switch to live Stripe objects.",
    "Create or provide a valid Stripe test-mode object.",
  ],
  [
    "webhook/reconciliation pending",
    "Test-mode evidence may not yet show final reconciliation.",
    "Do not promise completion from pending evidence.",
    "Check dashboard evidence and configured test webhook status where available.",
  ],
  [
    "live refunds blocked",
    "The request attempted live refund behavior that v1 blocks.",
    "Do not retry live-money operations.",
    "Keep live refunds blocked and review production readiness separately.",
  ],
];

const proofChecklist = [
  "Agent uses RefundHold key, not Stripe key.",
  "Stripe secret key is not available to the AI agent.",
  "Test uses demo simulation or Stripe test-mode only.",
  "Refund request returns refund_request_id.",
  "needs_review is shown for a medium refund.",
  "Reviewer approves or rejects.",
  "Execution is recorded or completed only in controlled mode.",
  "Audit trail records proposal, policy, reviewer decision, and outcome.",
  "No live Stripe dashboard event is created.",
  "/app/stripe and /security still state live refunds are blocked.",
];

const notProvenItems = [
  "Does not prove production live-money readiness.",
  "Does not prove final RBAC.",
  "Does not prove immutable audit export.",
  "Does not prove production idempotency.",
  "Does not prove production webhook reconciliation.",
  "Does not replace privacy/legal/security review.",
  "Does not prove operational controls for manual Stripe dashboard refunds.",
  "Does not enable live refunds.",
];

export default function TestModePilotPage() {
  return (
    <main className="docs-page min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold docs
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Test-mode pilot contract
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            The controlled contract for testing RefundHold with AI-generated
            Stripe refund proposals, human approval, and Stripe test objects.
            Live refunds are blocked in v1.
          </p>
        </div>

        <div className="mt-10 rounded-lg border border-amber-300/50 bg-amber-300/10 p-5">
          <p className="text-sm font-semibold text-amber-200">
            Pilot boundary
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            This page describes controlled demo simulation and Stripe test-mode
            behavior. It does not claim production live-money readiness, stable
            public callback support, production idempotency, or live Stripe
            refund execution.
          </p>
        </div>

        <DocsNavigation currentPath="/docs/test-mode-pilot" />

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <DocsSection title="What this contract covers">
              <Checklist items={coverageItems} />
            </DocsSection>

            <DocsSection title="Pilot architecture">
              <DefinitionList items={actorRows} />
              <Checklist items={architectureRules} />
            </DocsSection>

            <DocsSection title="End-to-end pilot flow">
              <div className="space-y-4">
                {pilotFlow.map((step) => (
                  <div
                    className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4"
                    key={step.title}
                  >
                    <h3 className="text-base font-semibold text-zinc-50">
                      {step.title}
                    </h3>
                    <Checklist items={step.body} />
                  </div>
                ))}
              </div>
            </DocsSection>

            <DocsSection title="State and decision contract">
              <p className="mb-5 text-sm leading-6 text-zinc-300">
                Decision values from create are allowed, needs_review, and
                blocked. Review and execution states include approved, rejected,
                executed, failed, and blocked.
              </p>
              <ThreeColumnTable
                columns={["Value", "Meaning", "Contract"]}
                rows={stateRows}
              />
            </DocsSection>

            <DocsSection title="Agent behavior contract">
              <TwoColumnTable
                columns={["RefundHold response", "Agent behavior"]}
                rows={agentRows}
              />
            </DocsSection>

            <DocsSection title="Trusted backend behavior contract">
              <p className="text-sm leading-6 text-zinc-300">
                The trusted backend or RefundHold-controlled execution boundary
                should:
              </p>
              <Checklist items={backendItems} />
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                Do not treat this as a production enforcement claim. For
                production, this boundary must be reviewed and hardened.
              </p>
            </DocsSection>

            <DocsSection title="Approval versus execution">
              <Checklist items={approvalExecutionItems} />
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                The current public response should not be treated as a stable
                execution_grant contract. Treat the grant concept as pilot
                hardening guidance unless a future public API documents it
                explicitly.
              </p>
            </DocsSection>

            <DocsSection title="Idempotency and retries">
              <Checklist items={retryItems} />
            </DocsSection>

            <DocsSection title="Waiting for human review">
              <p className="text-sm leading-6 text-zinc-300">
                When the decision is needs_review:
              </p>
              <Checklist items={waitingItems} />
            </DocsSection>

            <DocsSection title="Webhook and polling contract">
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold text-zinc-50">
                    Current pilot contract
                  </h3>
                  <Checklist
                    items={[
                      "Use the reviewer dashboard and API responses to verify state.",
                      "Webhook callbacks are not yet a stable public contract unless already implemented.",
                      "Polling guidance is not production-ready unless already implemented.",
                    ]}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-50">
                    Planned callback events
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-zinc-300">
                    These are planned contract candidates, not implemented
                    facts:
                  </p>
                  <Checklist items={plannedEvents} />
                  <CodeBlock value={callbackCandidate} />
                </div>
              </div>
            </DocsSection>

            <DocsSection title="Error and failure handling">
              <p className="mb-5 text-sm leading-6 text-zinc-300">
                For exact implemented HTTP status categories, see the{" "}
                <InlineLink href="/docs/api">API reference</InlineLink>. The
                table below describes what the pilot should do without inventing
                new status codes.
              </p>
              <FourColumnTable
                columns={["Case", "What it means", "Agent should do", "Operator should do"]}
                rows={errorRows}
              />
            </DocsSection>

            <DocsSection title="Test-mode proof checklist">
              <Checklist items={proofChecklist} />
            </DocsSection>

            <DocsSection title="What this contract does not prove">
              <Checklist items={notProvenItems} />
            </DocsSection>

            <DocsSection title="Related docs">
              <div className="grid gap-3 sm:grid-cols-2">
                <CtaLink href="/docs/test-mode-runbook">
                  Exact test-mode runbook
                </CtaLink>
                <CtaLink href="/docs/pilot-acceptance">
                  Pilot acceptance contract
                </CtaLink>
                <CtaLink href="/docs/api">API reference</CtaLink>
                <CtaLink href="/docs/stripe-test-mode">
                  Stripe test-mode setup
                </CtaLink>
                <CtaLink href="/docs/prevent-bypass">Prevent bypass</CtaLink>
                <CtaLink href="/demo/reviewer">
                  Reviewer dashboard demo
                </CtaLink>
                <CtaLink href="/docs/quickstart">Quickstart</CtaLink>
                <CtaLink href="/contact">Contact</CtaLink>
              </div>
            </DocsSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-xl font-semibold text-zinc-50">
              Pilot contract
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              <CtaLink href="/docs/test-mode-runbook">
                Exact test-mode runbook
              </CtaLink>
              <CtaLink href="/docs/pilot-acceptance">
                Pilot acceptance contract
              </CtaLink>
              <CtaLink href="/docs/api">API reference</CtaLink>
              <CtaLink href="/docs/stripe-test-mode">
                Stripe test-mode setup
              </CtaLink>
              <CtaLink href="/docs/prevent-bypass">Prevent bypass</CtaLink>
              <CtaLink href="/demo/reviewer">
                Reviewer dashboard demo
              </CtaLink>
              <CtaLink href="/docs/quickstart">Quickstart</CtaLink>
              <CtaLink href="/contact">Contact</CtaLink>
            </div>
            <div className="mt-6 border-t border-zinc-800 pt-5 text-sm leading-6 text-zinc-300">
              <p className="font-semibold text-zinc-50">Stable today</p>
              <p className="mt-2">
                Create refund request, review, approve or reject, execute or
                record controlled execution, and inspect audit evidence.
              </p>
              <p className="mt-4 font-semibold text-zinc-50">
                Not stable here
              </p>
              <p className="mt-2">
                Public callback webhooks, production polling guidance, public
                idempotency keys, SDKs, and live refunds.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function DocsSection({
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

function DefinitionList({ items }: { items: string[][] }) {
  return (
    <dl className="grid gap-3">
      {items.map(([label, value]) => (
        <div
          className="rounded-md border border-zinc-800 bg-zinc-950/70 p-4"
          key={label}
        >
          <dt className="text-sm font-semibold text-zinc-50">{label}</dt>
          <dd className="mt-2 text-sm leading-6 text-zinc-300">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function TwoColumnTable({
  columns,
  rows,
}: {
  columns: [string, string];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
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
          {rows.map(([first, second]) => (
            <tr className="border-b border-zinc-800 last:border-b-0" key={first}>
              <td className="py-3 pr-4 font-mono text-emerald-200">
                {first}
              </td>
              <td className="py-3 text-zinc-300">{second}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
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
              <td className="py-3 pr-4 font-mono text-emerald-200">
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

function FourColumnTable({
  columns,
  rows,
}: {
  columns: [string, string, string, string];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-left text-sm">
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
          {rows.map(([first, second, third, fourth]) => (
            <tr className="border-b border-zinc-800 last:border-b-0" key={first}>
              <td className="py-3 pr-4 text-zinc-100">{first}</td>
              <td className="py-3 pr-4 text-zinc-300">{second}</td>
              <td className="py-3 pr-4 text-zinc-300">{third}</td>
              <td className="py-3 text-zinc-300">{fourth}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function InlineLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link className="font-semibold text-emerald-200 hover:text-emerald-100" href={href}>
      {children}
    </Link>
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
