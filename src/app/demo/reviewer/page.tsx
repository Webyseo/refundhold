import Link from "next/link";

type RefundStatus =
  | "Waiting for review"
  | "Approved"
  | "Rejected"
  | "Executed"
  | "Blocked"
  | "Needs attention";

type PolicyResult =
  | "Allowed by policy"
  | "Human approval required"
  | "Blocked by policy";

type RiskLevel = "Low" | "Medium" | "High" | "Attention";

type StripeMode = "Demo simulation" | "Stripe test-mode";

type DemoRefund = {
  id: string;
  amount: string;
  customer: string;
  status: RefundStatus;
  policy: PolicyResult;
  risk: RiskLevel;
  stripeMode: StripeMode;
  outcome: string;
  reason: string;
};

const demoRefunds: DemoRefund[] = [
  {
    id: "demo-refund-420",
    amount: "$420.00 USD",
    customer: "customer-042@example.test",
    status: "Waiting for review",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Demo simulation",
    outcome: "Reviewer decision needed",
    reason: "Possible duplicate billing",
  },
  {
    id: "demo-refund-100",
    amount: "$100.00 USD",
    customer: "customer-100@example.test",
    status: "Approved",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Stripe test-mode",
    outcome: "Approved after damaged item evidence",
    reason: "Damaged item evidence",
  },
  {
    id: "demo-refund-275",
    amount: "$275.00 USD",
    customer: "customer-275@example.test",
    status: "Rejected",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Demo simulation",
    outcome: "AI reason incomplete",
    reason: "AI reason incomplete",
  },
  {
    id: "demo-refund-035",
    amount: "$35.00 USD",
    customer: "customer-035@example.test",
    status: "Executed",
    policy: "Allowed by policy",
    risk: "Low",
    stripeMode: "Demo simulation",
    outcome: "Demo execution recorded",
    reason: "Allowed by low-value policy",
  },
  {
    id: "demo-refund-850",
    amount: "$850.00 USD",
    customer: "customer-850@example.test",
    status: "Blocked",
    policy: "Blocked by policy",
    risk: "High",
    stripeMode: "Demo simulation",
    outcome: "Above policy limit",
    reason: "Above policy limit",
  },
  {
    id: "demo-refund-120",
    amount: "$120.00 USD",
    customer: "customer-120@example.test",
    status: "Needs attention",
    policy: "Human approval required",
    risk: "Attention",
    stripeMode: "Stripe test-mode",
    outcome: "Missing Stripe test object or webhook pending",
    reason: "Missing Stripe test object",
  },
  {
    id: "demo-refund-064",
    amount: "$64.00 USD",
    customer: "customer-064@example.test",
    status: "Waiting for review",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Demo simulation",
    outcome: "Reviewer should check order notes",
    reason: "Late delivery refund request",
  },
];

const refundSummary = [
  ["Amount", "$420.00 USD"],
  ["Customer", "customer-042@example.test"],
  ["Requested by", "AI support agent"],
  ["Stripe mode", "Demo simulation"],
  ["Current status", "Waiting for review"],
];

const evidenceItems = [
  ["Request ID", "demo-refund-420"],
  ["Actor", "AI support agent"],
  ["Policy version", "demo-policy-v1"],
  ["Matched rule", "medium-refund-review"],
  ["Idempotency", "demo-refund-420-proposal"],
  ["livemode", "false"],
  ["Webhook status", "not required for demo simulation"],
];

const auditTrail = [
  ["09:00", "Refund proposal received from AI support agent"],
  ["09:00", "RefundHold evaluated policy"],
  ["09:00", "Human approval requested"],
  ["Pending", "Reviewer decision needed"],
];

const integrationSteps = [
  "Your AI support agent sends the refund proposal to RefundHold.",
  "RefundHold returns allowed, needs review, or blocked.",
  "If the refund needs review, the agent tells the customer the refund is waiting for human review.",
  "A reviewer approves or rejects in RefundHold.",
  "In demo simulation, no Stripe call is made.",
  "In Stripe test-mode, only Stripe test objects are used.",
  "Live refunds are blocked in v1.",
];

export default function ReviewerDemoPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-50">
      <section className="mx-auto max-w-7xl">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Reviewer dashboard demo
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            See how a human reviews AI-generated Stripe refunds before they
            continue. Demo data only. No real Stripe money moves.
          </p>
        </div>

        <section
          className="mt-8 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5"
          aria-label="Read-only demo safety notice"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-emerald-100">
                Read-only demo
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-200">
                No login required. No Stripe calls. No real money moves. Live
                refunds are blocked in v1.
              </p>
            </div>
            <p className="w-fit rounded-full border border-emerald-200/40 bg-zinc-950/60 px-3 py-1 text-sm font-semibold text-emerald-100">
              Public static demo data
            </p>
          </div>
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)] xl:items-start">
          <section className="rounded-lg border border-zinc-800 bg-zinc-900/60">
            <div className="border-b border-zinc-800 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
                    Curated refund queue
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                    Refund requests
                  </h2>
                </div>
                <p className="text-sm font-medium text-zinc-300">
                  {demoRefunds.length} demo requests
                </p>
              </div>
            </div>

            <div className="divide-y divide-zinc-800">
              {demoRefunds.map((refund) => (
                <RefundQueueItem key={refund.id} refund={refund} />
              ))}
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
                    Detail preview
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                    $420.00 refund request
                  </h2>
                </div>
                <StatusBadge status="Waiting for review" />
              </div>

              <DetailSection title="What the AI agent says">
                <p className="text-sm leading-6 text-zinc-300">
                  The customer reports a possible duplicate charge and asks for
                  a refund. The AI support agent recommends a $420.00 refund,
                  but the amount falls inside the manual review range.
                </p>
              </DetailSection>

              <DetailSection title="Refund summary">
                <DefinitionGrid items={refundSummary} />
              </DetailSection>

              <DetailSection title="Policy matched">
                <div className="rounded-md border border-amber-300/30 bg-amber-300/10 p-4">
                  <p className="text-base font-semibold text-amber-100">
                    $50-$500 -&gt; human approval required
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-200">
                    Result: Refund held for human review
                  </p>
                </div>
              </DetailSection>

              <DetailSection title="Evidence">
                <DefinitionGrid items={evidenceItems} />
              </DetailSection>

              <DetailSection title="Audit trail">
                <ol className="space-y-3">
                  {auditTrail.map(([time, event]) => (
                    <li className="flex gap-3 text-sm text-zinc-300" key={event}>
                      <span className="min-w-16 shrink-0 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-center text-xs font-semibold text-zinc-100">
                        {time}
                      </span>
                      <span className="pt-1">{event}</span>
                    </li>
                  ))}
                </ol>
              </DetailSection>
            </section>

            <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
              <h2 className="text-xl font-semibold text-zinc-50">
                How this maps to a real integration
              </h2>
              <ul className="mt-5 space-y-3">
                {integrationSteps.map((step) => (
                  <li className="flex gap-3 text-sm leading-6 text-zinc-300" key={step}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </section>

            <nav
              className="grid gap-3 sm:grid-cols-2"
              aria-label="Reviewer demo next steps"
            >
              <Link
                className="inline-flex items-center justify-center rounded-md bg-emerald-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
                href="/demo"
              >
                Try public demo
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
                href="/docs/api"
              >
                Read API docs
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
                href="/docs/quickstart"
              >
                Read quickstart
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
                href="/contact"
              >
                Contact for test-mode pilot
              </Link>
            </nav>
          </div>
        </div>
      </section>
    </main>
  );
}

function RefundQueueItem({ refund }: { refund: DemoRefund }) {
  return (
    <article className="p-5 transition hover:bg-zinc-900">
      <div className="grid gap-4 lg:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1fr)_minmax(10rem,0.8fr)] lg:items-start">
        <div>
          <p className="text-2xl font-semibold tracking-tight text-zinc-50">
            {refund.amount}
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-300">
            {refund.customer}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <QueueField label="Status" value={<StatusBadge status={refund.status} />} />
          <QueueField label="Policy result" value={refund.policy} />
          <QueueField label="Risk" value={`${refund.risk} risk`} />
          <QueueField label="Stripe mode" value={refund.stripeMode} />
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
            Next action or outcome
          </p>
          <p className="mt-2 text-sm font-semibold text-zinc-50">
            {refund.outcome}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-300">{refund.reason}</p>
        </div>
      </div>
    </article>
  );
}

function QueueField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
        {label}
      </p>
      <div className="mt-1 text-sm font-semibold text-zinc-50">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: RefundStatus }) {
  const styles: Record<RefundStatus, string> = {
    "Waiting for review": "border-amber-300/40 bg-amber-300/10 text-amber-100",
    Approved: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    Rejected: "border-red-300/40 bg-red-300/10 text-red-100",
    Executed: "border-sky-300/40 bg-sky-300/10 text-sky-100",
    Blocked: "border-red-300/40 bg-red-300/10 text-red-100",
    "Needs attention": "border-fuchsia-300/40 bg-fuchsia-300/10 text-fuchsia-100",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function DetailSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="mt-6 border-t border-zinc-800 pt-5">
      <h3 className="text-base font-semibold text-zinc-50">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function DefinitionGrid({ items }: { items: string[][] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {items.map(([label, value]) => (
        <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-3" key={label}>
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-50">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
