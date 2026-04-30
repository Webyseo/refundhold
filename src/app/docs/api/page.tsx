import Link from "next/link";

const requestFields = [
  ["amount", "Refund amount for the proposal, sent by your backend."],
  ["currency", "Three-letter currency code such as usd."],
  ["reason", "Human-readable reason from the AI support agent."],
  [
    "stripe_mode",
    "The public shortcut currently supports demo_simulation. Stripe test-mode pilots use connector: stripe_test in the compatibility payload.",
  ],
  ["idempotency_key", "Stable key for retrying the same refund proposal."],
];

const decisionOutcomes = [
  [
    "allowed",
    "The refund is within policy and can continue through the configured safe path.",
  ],
  [
    "needs review",
    "RefundHold holds the refund until a human reviewer approves or rejects it.",
  ],
  ["blocked", "The refund is outside policy and should not continue."],
];

const safetyItems = [
  "Demo simulation does not call Stripe.",
  "Stripe test-mode uses Stripe test objects only.",
  "Live refunds are blocked in v1.",
  "A reviewer decision is required before held refunds can continue.",
];

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-50">
      <section className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold docs
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            RefundHold API docs
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Send refund proposals from an AI support agent to RefundHold before
            they continue to Stripe. RefundHold returns allowed, needs review,
            or blocked.
          </p>
        </div>

        <div className="mt-10 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <DocsSection title="Create a refund proposal">
              <p className="text-sm leading-6 text-zinc-300">
                Preferred endpoint:
              </p>
              <p className="mt-3 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-sm text-zinc-100">
                POST /api/v1/refund-requests
              </p>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                Your backend sends the refund proposal with a private agent API
                key. Never send live Stripe secrets to RefundHold as agent
                credentials.
              </p>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                For controlled Stripe test-mode pilots, use Stripe test objects
                only and follow the test-mode runbook before executing any test
                refund.
              </p>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                For bypass prevention, keep Stripe refund capability out of the
                AI support agent and route refund proposals through RefundHold.
              </p>
            </DocsSection>

            <DocsSection title="Request fields">
              <DefinitionList items={requestFields} />
            </DocsSection>

            <DocsSection title="Decision outcomes">
              <DefinitionList items={decisionOutcomes} />
            </DocsSection>

            <DocsSection title="Reviewer flow">
              <p className="text-sm leading-6 text-zinc-300">
                Refunds that need review appear in the reviewer dashboard. A
                human reviewer approves or rejects the refund before it can
                continue. The public reviewer demo shows the same decision
                context with curated static data.
              </p>
              <Link
                className="mt-5 inline-flex items-center justify-center rounded-md bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
                href="/demo/reviewer"
              >
                View reviewer dashboard demo
              </Link>
            </DocsSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-xl font-semibold text-zinc-50">
              Safety boundary
            </h2>
            <ul className="mt-5 space-y-3">
              {safetyItems.map((item) => (
                <li className="flex gap-3 text-sm leading-6 text-zinc-300" key={item}>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-col gap-3 border-t border-zinc-800 pt-5">
              <Link
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
                href="/docs/stripe-test-mode"
              >
                Read Stripe test-mode setup
              </Link>
              <Link
                className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
                href="/docs/prevent-bypass"
              >
                Read bypass prevention
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

function DefinitionList({ items }: { items: string[][] }) {
  return (
    <dl className="grid gap-3">
      {items.map(([label, value]) => (
        <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-4" key={label}>
          <dt className="text-sm font-semibold text-zinc-50">{label}</dt>
          <dd className="mt-2 text-sm leading-6 text-zinc-300">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
