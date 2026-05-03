import Link from "next/link";

import { PublicHeader } from "../../public-header";

type RefundStatus = "Needs review" | "Approved" | "Rejected" | "Executed" | "Blocked";
type PolicyResult = "Allowed by policy" | "Human approval required" | "Blocked by policy";
type RiskLevel = "Low" | "Medium" | "High";
type Priority = "Low" | "Medium" | "High";
type StripeMode = "Demo simulation" | "Stripe test-mode";

type DemoRefund = {
  id: string;
  time: string;
  amount: string;
  customer: string;
  status: RefundStatus;
  policy: PolicyResult;
  risk: RiskLevel;
  stripeMode: StripeMode;
  owner: string;
  sla: string;
  priority: Priority;
  nextAction: string;
  context: string;
};

const summaryCards = [
  ["Needs review", "2", "Waiting for a human decision"],
  ["Approved today", "2", "Reviewer decisions recorded"],
  ["Blocked by policy", "1", "Stopped before execution"],
  ["Demo/test executions recorded", "2", "Evidence captured without live money"],
];

const demoRefunds: DemoRefund[] = [
  {
    id: "demo-refund-420",
    time: "09:03",
    amount: "$420.00 USD",
    customer: "billing-upgrade@example.test",
    status: "Needs review",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Demo simulation",
    owner: "Finance reviewer",
    sla: "Due in 12 min",
    priority: "High",
    nextAction: "Review duplicate billing claim",
    context: "Possible duplicate charge after plan upgrade",
  },
  {
    id: "demo-refund-064",
    time: "09:07",
    amount: "$64.00 USD",
    customer: "delivery-case@example.test",
    status: "Needs review",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Demo simulation",
    owner: "Ops reviewer",
    sla: "Waiting 4 min",
    priority: "Medium",
    nextAction: "Check delivery evidence",
    context: "Late delivery refund request",
  },
  {
    id: "demo-refund-100",
    time: "09:11",
    amount: "$100.00 USD",
    customer: "damaged-item@example.test",
    status: "Approved",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Stripe test-mode",
    owner: "Finance reviewer",
    sla: "Reviewed 9 min ago",
    priority: "Medium",
    nextAction: "Approved for controlled test-mode path",
    context: "Damaged item evidence attached",
  },
  {
    id: "demo-refund-210",
    time: "09:18",
    amount: "$210.00 USD",
    customer: "subscription-credit@example.test",
    status: "Approved",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Demo simulation",
    owner: "Support lead",
    sla: "Reviewed 16 min ago",
    priority: "Medium",
    nextAction: "Demo approval recorded",
    context: "Unused annual plan credit",
  },
  {
    id: "demo-refund-035",
    time: "09:24",
    amount: "$35.00 USD",
    customer: "small-refund@example.test",
    status: "Executed",
    policy: "Allowed by policy",
    risk: "Low",
    stripeMode: "Demo simulation",
    owner: "Support lead",
    sla: "Completed 21 min ago",
    priority: "Low",
    nextAction: "Demo execution evidence recorded",
    context: "Allowed by low-value policy",
  },
  {
    id: "demo-refund-048",
    time: "09:27",
    amount: "$48.00 USD",
    customer: "test-object@example.test",
    status: "Executed",
    policy: "Allowed by policy",
    risk: "Low",
    stripeMode: "Stripe test-mode",
    owner: "Ops reviewer",
    sla: "Completed 24 min ago",
    priority: "Low",
    nextAction: "Test execution evidence recorded",
    context: "Stripe test object validation",
  },
  {
    id: "demo-refund-275",
    time: "09:31",
    amount: "$275.00 USD",
    customer: "unclear-request@example.test",
    status: "Rejected",
    policy: "Human approval required",
    risk: "Medium",
    stripeMode: "Demo simulation",
    owner: "Finance reviewer",
    sla: "Reviewed 29 min ago",
    priority: "Medium",
    nextAction: "AI support agent should escalate",
    context: "Customer reason did not match order evidence",
  },
  {
    id: "demo-refund-850",
    time: "09:36",
    amount: "$850.00 USD",
    customer: "high-value-refund@example.test",
    status: "Blocked",
    policy: "Blocked by policy",
    risk: "High",
    stripeMode: "Demo simulation",
    owner: "Finance reviewer",
    sla: "Blocked at policy check",
    priority: "High",
    nextAction: "Escalate outside automatic refund path",
    context: "Above demo policy limit",
  },
];

const reviewerFields = [
  ["AI reason", "Possible duplicate billing after plan upgrade"],
  [
    "Customer claim snippet",
    "Customer says they were charged twice after upgrading their plan and asks for a refund before the next billing cycle.",
  ],
  ["Order/payment context", "Subscription upgrade processed during active billing cycle"],
  ["Policy matched", "$50-$500 -> human approval required"],
  ["Refund amount", "$420.00 USD"],
  ["Stripe mode", "Demo simulation"],
  ["Live mode", "No"],
  ["Order ID", "order_demo_420"],
  ["Payment reference", "pi_test_demo_420"],
  ["Refundable amount", "$420.00 USD"],
  ["Previous refunds", "None in last 90 days"],
  ["Reviewer queue", "Finance reviewer"],
  ["SLA", "Due in 12 min"],
];

const evidenceItems = [
  ["Request ID", "demo-refund-420"],
  ["Policy version", "demo-policy-v1"],
  ["Owner", "Finance reviewer"],
  ["Priority", "High"],
  ["Live mode", "No"],
  ["Idempotency key", "demo-refund-420-proposal"],
  ["Webhook status", "Not required for demo simulation"],
];

const auditTrail = [
  ["09:03", "AI support agent submitted refund proposal"],
  ["09:03", "RefundHold evaluated policy demo-policy-v1"],
  ["09:03", "RefundHold held refund for human approval"],
  ["Pending", "Finance reviewer decision needed before execution"],
];

const approveConsequences = [
  "RefundHold records the reviewer decision.",
  "Demo simulation records execution evidence without calling Stripe.",
  "Stripe test-mode pilots use test objects only.",
  "Live refunds remain blocked in v1.",
];

const rejectConsequences = [
  "RefundHold records the rejection.",
  "The refund cannot continue automatically.",
  "The AI support agent should not retry or call Stripe directly.",
];

export default function ReviewerDemoPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <PublicHeader />
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Reviewer dashboard demo
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-zinc-300">
            A read-only operational inbox for reviewing AI-generated Stripe
            refund requests before anything can continue toward Stripe.
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
                No login required. No Stripe calls. No database read. No real
                money moves. Live refunds are blocked in v1.
              </p>
            </div>
            <p className="w-fit rounded-full border border-emerald-200/40 bg-zinc-950/60 px-3 py-1 text-sm font-semibold text-emerald-100">
              Read-only sample data
            </p>
          </div>
        </section>

        <section
          className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Operational summary"
        >
          {summaryCards.map(([label, value, description]) => (
            <article
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5"
              key={label}
            >
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-semibold text-zinc-200">{label}</p>
                <p className="text-3xl font-semibold leading-none text-zinc-50">
                  {value}
                </p>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">
                {description}
              </p>
            </article>
          ))}
        </section>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(420px,0.88fr)] xl:items-start">
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
                  {demoRefunds.length} read-only sample requests
                </p>
              </div>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                Each card shows the decision signal a reviewer scans first:
                amount, status, risk, customer context, SLA, owner, and the next
                action or outcome.
              </p>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              {demoRefunds.map((refund) => (
                <RefundQueueItem key={refund.id} refund={refund} />
              ))}
            </div>
          </section>

          <div className="space-y-6 xl:sticky xl:top-6">
            <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
                    Detail preview
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-zinc-50">
                    $420.00 refund request
                  </h2>
                  <p className="mt-2 text-sm font-medium text-zinc-300">
                    billing-upgrade@example.test · Due in 12 min
                  </p>
                </div>
                <StatusBadge status="Needs review" />
              </div>

              <DetailSection title="Why this needs review">
                <p className="text-sm leading-6 text-zinc-300">
                  RefundHold held this refund because the amount falls inside
                  the manual review range and the AI support agent reported a
                  possible duplicate billing claim.
                </p>
              </DetailSection>

              <DetailSection title="What the reviewer sees">
                <DefinitionGrid items={reviewerFields} />
              </DetailSection>

              <DetailSection title="What happens next">
                <div className="grid gap-4 lg:grid-cols-2">
                  <ConsequenceCard
                    items={approveConsequences}
                    title="If approved"
                  />
                  <ConsequenceCard items={rejectConsequences} title="If rejected" />
                </div>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    aria-disabled="true"
                    className="inline-flex cursor-not-allowed items-center justify-center rounded-md border border-emerald-300/40 bg-emerald-300/10 px-4 py-2.5 text-sm font-semibold text-emerald-100"
                    disabled
                    type="button"
                  >
                    Approve refund (demo)
                  </button>
                  <button
                    aria-disabled="true"
                    className="inline-flex cursor-not-allowed items-center justify-center rounded-md border border-red-300/40 bg-red-300/10 px-4 py-2.5 text-sm font-semibold text-red-100"
                    disabled
                    type="button"
                  >
                    Reject refund (demo)
                  </button>
                </div>
              </DetailSection>

              <DetailSection title="Evidence">
                <DefinitionGrid items={evidenceItems} />
              </DetailSection>

              <DetailSection title="Audit trail">
                <ol className="space-y-3">
                  {auditTrail.map(([time, event]) => (
                    <li
                      className="grid gap-3 text-sm text-zinc-300 sm:grid-cols-[5rem_minmax(0,1fr)]"
                      key={`${time}-${event}`}
                    >
                      <span className="w-fit rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-center text-xs font-semibold text-zinc-100">
                        {time}
                      </span>
                      <span className="pt-1">{event}</span>
                    </li>
                  ))}
                </ol>
              </DetailSection>
            </section>

            <nav
              className="grid gap-3 sm:grid-cols-2"
              aria-label="Reviewer demo next steps"
            >
              <CtaLink href="/demo" primary>
                Try public demo
              </CtaLink>
              <CtaLink href="/docs/api">Read API docs</CtaLink>
              <CtaLink href="/docs/stripe-test-mode">
                Read Stripe test-mode setup
              </CtaLink>
              <CtaLink href="/docs/prevent-bypass">Read bypass prevention</CtaLink>
              <CtaLink href="/contact">Contact for pilot</CtaLink>
            </nav>
          </div>
        </div>
      </section>
    </main>
  );
}

function RefundQueueItem({ refund }: { refund: DemoRefund }) {
  const actionLabel =
    refund.status === "Needs review" || refund.status === "Blocked"
      ? "Next:"
      : "Outcome:";

  return (
    <article className="rounded-lg border border-zinc-800 bg-zinc-950/50 p-4 transition hover:border-zinc-700 hover:bg-zinc-950/80">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_12rem] lg:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 text-2xl font-semibold tracking-tight text-zinc-50">
              {refund.amount}
            </p>
            <StatusBadge status={refund.status} />
            <RiskBadge risk={refund.risk} />
          </div>
          <p className="mt-2 break-all text-sm font-semibold text-zinc-200">
            {refund.customer}
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            {refund.context}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-3 gap-y-2 text-xs font-semibold text-zinc-400">
            <span>{refund.time}</span>
            <span aria-hidden="true">·</span>
            <span>{refund.sla}</span>
            <span aria-hidden="true">·</span>
            <span>{refund.owner}</span>
            <span aria-hidden="true">·</span>
            <span>{refund.stripeMode}</span>
          </div>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-900/70 px-3 py-2">
          <p className="text-sm leading-6 text-zinc-200">
            <span className="font-semibold text-emerald-300">
              {actionLabel}
            </span>{" "}
            {refund.nextAction}
          </p>
        </div>
      </div>
    </article>
  );
}

function StatusBadge({ status }: { status: RefundStatus }) {
  const styles: Record<RefundStatus, string> = {
    "Needs review": "border-amber-300/40 bg-amber-300/10 text-amber-100",
    Approved: "border-emerald-300/40 bg-emerald-300/10 text-emerald-100",
    Rejected: "border-red-300/40 bg-red-300/10 text-red-100",
    Executed: "border-sky-300/40 bg-sky-300/10 text-sky-100",
    Blocked: "border-red-300/40 bg-red-300/10 text-red-100",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function RiskBadge({ risk }: { risk: RiskLevel }) {
  const styles: Record<RiskLevel, string> = {
    Low: "border-sky-300/40 bg-sky-300/10 text-sky-100",
    Medium: "border-amber-300/40 bg-amber-300/10 text-amber-100",
    High: "border-red-300/40 bg-red-300/10 text-red-100",
  };

  return (
    <span
      className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[risk]}`}
    >
      {risk} risk
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
        <div
          className="rounded-md border border-zinc-800 bg-zinc-950/70 p-3"
          key={label}
        >
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-300">
            {label}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-50">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ConsequenceCard({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/70 p-4">
      <h4 className="text-sm font-semibold text-zinc-50">{title}</h4>
      <ul className="mt-3 space-y-2">
        {items.map((item) => (
          <li className="flex gap-2 text-sm leading-6 text-zinc-300" key={item}>
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CtaLink({
  children,
  href,
  primary = false,
}: {
  children: React.ReactNode;
  href: string;
  primary?: boolean;
}) {
  const className = primary
    ? "inline-flex items-center justify-center rounded-md bg-emerald-300 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
    : "inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900";

  return (
    <Link className={className} href={href}>
      {children}
    </Link>
  );
}
