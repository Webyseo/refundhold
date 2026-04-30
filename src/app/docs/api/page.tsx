import Link from "next/link";

const createRefundCurl = `curl -X POST http://localhost:3000/api/v1/refund-requests \\
  -H "Authorization: Bearer <agent_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "stripe_mode": "demo_simulation",
    "amount": 42000,
    "currency": "usd",
    "reason": "AI support agent recommends refund"
  }'`;

const needsReviewResponse = `{
  "refund_request_id": "ar_123",
  "decision": "needs_review",
  "reason": "Human approval required for refunds between $50 and $500",
  "review_url": "/app/refund-requests/ar_123"
}`;

const approveResponse = `{
  "refund_request_id": "ar_123",
  "status": "approved",
  "decision": "approved",
  "outcome": "approved",
  "review_url": "/app/refund-requests/ar_123",
  "message": "Refund approved."
}`;

const executeResponse = `{
  "refund_request_id": "ar_123",
  "status": "executed",
  "outcome": "executed",
  "review_url": "/app/refund-requests/ar_123",
  "message": "Demo execution recorded."
}`;

const invalidPayloadError = `{
  "error": "invalid_payload",
  "message": "Request body is invalid."
}`;

const missingKeyError = `{
  "error": "unauthorized",
  "message": "Authorization bearer token is required."
}`;

const invalidKeyError = `{
  "error": "unauthorized",
  "message": "API key is invalid."
}`;

const notFoundError = `{
  "error": "not_found",
  "refund_request_id": "ar_missing",
  "message": "Refund request was not found."
}`;

const notExecutableError = `{
  "error": "not_executable",
  "refund_request_id": "ar_123",
  "message": "Refund request must be approved before execution."
}`;

const stripeTestPayload = `{
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
}`;

const agentPrompt = `You are allowed to recommend refunds, but you must not call Stripe directly.
For refund requests, send a proposal to RefundHold.
If RefundHold returns needs_review, tell the customer that the refund is waiting for human review.
If RefundHold returns blocked, do not retry or bypass RefundHold.
Never use Stripe secret keys.
Never promise that a refund has completed unless the trusted backend confirms execution.`;

const pseudocodeFlow = [
  "collect refund context",
  "call RefundHold",
  "switch on decision",
  "allowed: continue only through trusted backend path",
  "needs_review: inform customer and stop",
  "blocked: safe refusal or escalation",
  "error: escalate to human",
];

const integrationSteps = [
  "The AI support agent does not call Stripe directly.",
  "The AI support agent sends a refund proposal to RefundHold.",
  "RefundHold evaluates policy.",
  "RefundHold returns allowed, needs_review, or blocked.",
  "If the decision is needs_review, the agent tells the customer the refund is waiting for human review.",
  "A human reviewer approves or rejects in RefundHold.",
  "Demo simulation records execution without calling Stripe.",
  "Stripe test-mode pilots use Stripe test objects only.",
  "Live refunds are blocked in v1.",
];

const authNotes = [
  "Use the demo agent API key configured for the controlled environment.",
  "Do not use Stripe secret keys as agent API keys.",
  "Do not commit real API keys.",
  "The AI support agent should receive a RefundHold agent key, not a Stripe key.",
];

const requestFields = [
  [
    "stripe_mode",
    "Required for the public shortcut. Use demo_simulation for the first public demo flow.",
  ],
  [
    "amount",
    "Positive integer refund amount in minor units. 42000 means $420.00 for usd.",
  ],
  ["currency", "Three-letter currency code, such as usd."],
  ["reason", "Human-readable reason from the AI support agent."],
];

const decisionRows = [
  {
    value: "allowed",
    meaning: "Refund proposal passed policy.",
    behavior:
      "Do not call Stripe directly unless your trusted backend flow explicitly allows it. Continue through the approved backend path.",
  },
  {
    value: "needs_review",
    meaning: "Human approval required.",
    behavior:
      "Tell the customer the refund is waiting for human review. Do not retry Stripe. Do not promise completion.",
  },
  {
    value: "blocked",
    meaning: "Refund cannot continue automatically.",
    behavior:
      "Do not retry. Do not call Stripe. Escalate or give a safe refusal message.",
  },
];

const endpointRows = [
  {
    endpoint: "POST /api/v1/refund-requests/[id]/approve",
    does: "Records a human approval for a refund request that is waiting for review.",
    when: "Call after an authorized reviewer has reviewed the request context and decided to approve.",
    who: "A human reviewer or trusted reviewer backend, not the AI support agent.",
    response:
      "Returns approved status, approved decision, approved outcome, review_url, and a human-readable message.",
  },
  {
    endpoint: "POST /api/v1/refund-requests/[id]/reject",
    does: "Records a human rejection for a refund request that is waiting for review.",
    when: "Call after an authorized reviewer decides the refund should not continue.",
    who: "A human reviewer or trusted reviewer backend, not the AI support agent.",
    response:
      "Returns rejected status, rejected decision, rejected outcome, review_url, and a human-readable message.",
  },
  {
    endpoint: "POST /api/v1/refund-requests/[id]/execute",
    does: "Records demo execution evidence or runs the controlled Stripe test-mode execution path when that pilot path is configured.",
    when: "Call only after the refund request has the required approved review state.",
    who: "A trusted backend or reviewer-controlled execution boundary, not an uncontrolled AI support agent loop.",
    response:
      "Returns executed outcome for successful demo simulation, failed when execution fails, or blocked/not_executable when the request state does not allow execution.",
  },
];

const executionItems = [
  "Demo simulation: RefundHold records the decision and demo execution evidence. No Stripe call is made.",
  "Stripe test-mode: controlled pilots may use Stripe test objects only.",
  "Live refunds: blocked in v1.",
  "Production live-money execution is not available until explicit readiness review.",
  "The safe architecture keeps Stripe keys away from the AI agent.",
  "A human approval should behave like a narrow permission for a specific refund request, amount, currency, mode, reviewer decision, and execution outcome.",
];

const errorRows = [
  ["400", "invalid payload", "invalid_payload", "Malformed JSON or unsupported request shape."],
  ["401", "missing API key", "unauthorized", "Authorization: Bearer <agent_api_key> is missing or malformed."],
  ["401", "invalid API key", "unauthorized", "The RefundHold agent key is not active or does not verify."],
  ["404", "refund request not found", "not_found", "The requested refund_request_id is not available to the caller."],
  ["409", "invalid state transition", "already_reviewed or not_reviewable", "The request is already reviewed or does not require human review."],
  ["409", "execution not allowed", "already_executed or not_executable", "The request has not been approved, was rejected, is blocked, or has already executed."],
  ["409 or 500", "live refunds blocked", "not_executable or execution_failed", "Live-mode Stripe objects or live execution settings are rejected for v1."],
];

const retryItems = [
  "Production-grade idempotency is a required production-readiness topic.",
  "Do not retry live-money operations blindly.",
  "For demo simulation, repeated test calls are safe but may create multiple demo refund requests because an idempotency field is not yet part of the public pilot contract.",
  "For Stripe test-mode pilots, retry behavior must be agreed before testing execution paths.",
  "Live refunds remain blocked in v1.",
];

const waitingItems = [
  "Show the user a message that the refund is waiting for human review.",
  "Store the refund_request_id.",
  "Link internal operators to review_url if appropriate.",
  "Use the reviewer dashboard to decide.",
  "Webhook or polling guidance is not production-ready unless already implemented.",
  "Do not keep the AI agent in an uncontrolled loop.",
  "Do not have the AI agent call Stripe while waiting.",
];

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-50">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold docs
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            API reference
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Send refund proposals from your AI support agent to RefundHold and
            receive a clear approval decision before anything can continue
            toward Stripe.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <DocsSection title="Integration model">
              <Checklist items={integrationSteps} />
              <p className="mt-5 rounded-md border border-amber-300/50 bg-amber-300/10 p-4 text-sm leading-6 text-zinc-200">
                RefundHold is the approval boundary. It only prevents bypass if
                Stripe refund capability is kept out of the AI agent and behind
                a trusted backend or RefundHold-controlled execution boundary.
              </p>
            </DocsSection>

            <DocsSection title="Authentication">
              <CodeBlock value="Authorization: Bearer <agent_api_key>" />
              <Checklist items={authNotes} />
            </DocsSection>

            <DocsSection title="Create refund request">
              <EndpointLine value="POST /api/v1/refund-requests" />
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                For the first public demo flow, use this safe demo simulation
                payload. The shortcut supports only these public fields.
              </p>
              <DefinitionList items={requestFields} />
              <CodeBlock value={createRefundCurl} />
            </DocsSection>

            <DocsSection title="Full example response: needs_review">
              <p className="text-sm leading-6 text-zinc-300">
                A $420 demo refund falls into the demo review band, so RefundHold
                holds the refund request and returns a reviewer link.
              </p>
              <CodeBlock value={needsReviewResponse} />
            </DocsSection>

            <DocsSection title="Decision values">
              <DecisionTable rows={decisionRows} />
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                Decision endpoints may return approved, rejected, executed,
                failed, or blocked depending on the request state and endpoint.
                Use exact underscore values such as needs_review when reading
                API fields.
              </p>
            </DocsSection>

            <DocsSection title="Decision endpoints">
              <div className="space-y-4">
                {endpointRows.map((row) => (
                  <EndpointCard key={row.endpoint} {...row} />
                ))}
              </div>
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                Demo simulation does not move real money. These endpoints are
                for controlled demo or pilot flows and do not claim production
                live execution readiness.
              </p>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-zinc-50">
                    Approval response shape
                  </p>
                  <CodeBlock value={approveResponse} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-50">
                    Demo execution response shape
                  </p>
                  <CodeBlock value={executeResponse} />
                </div>
              </div>
            </DocsSection>

            <DocsSection title="Execution model">
              <Checklist items={executionItems} />
            </DocsSection>

            <DocsSection title="Error responses">
              <p className="text-sm leading-6 text-zinc-300">
                These categories reflect the current route handlers and tests.
                Some 5xx failure details may vary during pilot hardening, but
                approval-control paths fail closed.
              </p>
              <ErrorTable rows={errorRows} />
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <CodeExample title="Invalid payload" value={invalidPayloadError} />
                <CodeExample title="Missing API key" value={missingKeyError} />
                <CodeExample title="Invalid API key" value={invalidKeyError} />
                <CodeExample title="Not found" value={notFoundError} />
                <CodeExample title="Execution not allowed" value={notExecutableError} />
              </div>
            </DocsSection>

            <DocsSection title="Idempotency and retries">
              <Checklist items={retryItems} />
            </DocsSection>

            <DocsSection title="Polling, webhooks, and waiting for human review">
              <Checklist items={waitingItems} />
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                Webhooks are not yet a production-ready public callback product
                contract for this API reference. If a webhook status appears as
                evidence in a controlled pilot, treat it as audit or
                reconciliation evidence, not as a general integration callback.
              </p>
            </DocsSection>

            <DocsSection title="Agent behavior guide">
              <p className="text-sm leading-6 text-zinc-300">
                Use guidance like this in the AI support agent system prompt:
              </p>
              <CodeBlock value={agentPrompt} />
              <p className="mt-5 text-sm font-semibold text-zinc-50">
                Pseudocode flow
              </p>
              <Checklist items={pseudocodeFlow} />
            </DocsSection>

            <DocsSection title="Supported modes">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  For the first public demo flow, use stripe_mode:
                  demo_simulation.
                </p>
                <p>
                  For controlled Stripe test-mode pilots, follow the Stripe
                  test-mode setup guide because the payload may include the
                  current compatibility shape.
                </p>
                <p>
                  The current Stripe test-mode pilot shape uses connector:
                  stripe_test, action: refund.create, resource:
                  stripe.payment_intent or stripe.charge, and parameters with
                  payment_intent_id or charge_id plus amount_minor.
                </p>
                <p>
                  Do not send alternate stripe_mode values. The public shortcut
                  only accepts demo_simulation.
                </p>
              </div>
              <CodeBlock value={stripeTestPayload} />
            </DocsSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-xl font-semibold text-zinc-50">
              Related docs
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              <CtaLink href="/docs/stripe-test-mode">
                Stripe test-mode setup
              </CtaLink>
              <CtaLink href="/docs/prevent-bypass">Prevent bypass</CtaLink>
              <CtaLink href="/demo/reviewer">
                Reviewer dashboard demo
              </CtaLink>
              <CtaLink href="/docs/quickstart">Quickstart</CtaLink>
              <CtaLink href="/contact">Contact for controlled pilot</CtaLink>
            </div>
            <div className="mt-6 border-t border-zinc-800 pt-5 text-sm leading-6 text-zinc-300">
              <p className="font-semibold text-zinc-50">Pilot boundary</p>
              <p className="mt-2">
                Use demo simulation for the public flow. Use Stripe test-mode
                only in controlled pilots. Live refunds are blocked in v1.
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

function EndpointLine({ value }: { value: string }) {
  return (
    <p className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-100">
      {value}
    </p>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
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
    <dl className="mt-5 grid gap-3">
      {items.map(([label, value]) => (
        <div
          className="border-b border-zinc-800 pb-3 last:border-b-0 last:pb-0"
          key={label}
        >
          <dt className="font-mono text-sm font-semibold text-zinc-50">
            {label}
          </dt>
          <dd className="mt-1 text-sm leading-6 text-zinc-300">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function DecisionTable({
  rows,
}: {
  rows: { value: string; meaning: string; behavior: string }[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-100">
            <th className="py-3 pr-4 font-semibold">Value</th>
            <th className="py-3 pr-4 font-semibold">Meaning</th>
            <th className="py-3 font-semibold">Agent behavior</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="border-b border-zinc-800 last:border-b-0" key={row.value}>
              <td className="py-3 pr-4 font-mono text-emerald-200">
                {row.value}
              </td>
              <td className="py-3 pr-4 text-zinc-300">{row.meaning}</td>
              <td className="py-3 text-zinc-300">{row.behavior}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EndpointCard({
  does,
  endpoint,
  response,
  when,
  who,
}: {
  endpoint: string;
  does: string;
  when: string;
  who: string;
  response: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-4">
      <p className="font-mono text-sm font-semibold text-emerald-200">
        {endpoint}
      </p>
      <dl className="mt-4 grid gap-3 text-sm leading-6">
        <DefinitionTerm label="What it does" value={does} />
        <DefinitionTerm label="When to call it" value={when} />
        <DefinitionTerm label="Who should call it" value={who} />
        <DefinitionTerm label="What the response means" value={response} />
      </dl>
    </div>
  );
}

function DefinitionTerm({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-zinc-50">{label}</dt>
      <dd className="mt-1 text-zinc-300">{value}</dd>
    </div>
  );
}

function ErrorTable({ rows }: { rows: string[][] }) {
  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-100">
            <th className="py-3 pr-4 font-semibold">Status</th>
            <th className="py-3 pr-4 font-semibold">Case</th>
            <th className="py-3 pr-4 font-semibold">Error</th>
            <th className="py-3 font-semibold">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([status, label, error, meaning]) => (
            <tr className="border-b border-zinc-800 last:border-b-0" key={label}>
              <td className="py-3 pr-4 font-mono text-zinc-100">{status}</td>
              <td className="py-3 pr-4 text-zinc-300">{label}</td>
              <td className="py-3 pr-4 font-mono text-emerald-200">{error}</td>
              <td className="py-3 text-zinc-300">{meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeExample({ title, value }: { title: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-semibold text-zinc-50">{title}</p>
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
