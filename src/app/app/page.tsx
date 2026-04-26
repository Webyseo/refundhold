import Link from "next/link";

export default function DashboardHomePage() {
  const flowSteps = [
    {
      title: "Refund request",
      body: "An AI support agent asks RefundHold before creating a Stripe refund.",
    },
    {
      title: "Policy decision",
      body: "RefundHold returns allow, deny, or approval required with a reason.",
    },
    {
      title: "Human review",
      body: "The demo reviewer approves or rejects medium-risk refund requests.",
    },
    {
      title: "Dry-run execution",
      body: "Approved refunds can be simulated in dry_run. This demo does not move real money.",
    },
    {
      title: "Audit trail",
      body: "Every step is recorded as explicit lifecycle evidence.",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_380px] lg:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
            Stripe refund review console
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950">
            See which AI-initiated Stripe refund needs attention, why, and what
            can happen next.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            RefundHold sits between an AI support agent and Stripe. This
            dashboard shows the refund queue, policy reason, reviewer decision,
            dry-run refund execution, and audit evidence.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app/action-requests?status=pending"
              className="rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Review pending refunds
            </Link>
            <Link
              href="/app/action-requests"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
            >
              View refund queue
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-950">
            Demo mental model
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            The reviewer is not managing identities. They are deciding whether a
            specific AI-initiated refund should be approved, rejected, or held.
          </p>
        </div>
      </div>

      <div className="mt-10 grid gap-3 lg:grid-cols-5">
        {flowSteps.map((step, index) => (
          <div
            key={step.title}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <p className="font-mono text-xs font-semibold text-emerald-700">
              0{index + 1}
            </p>
            <h2 className="mt-3 text-sm font-semibold text-zinc-950">
              {step.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">{step.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Refund decision smoke test
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Creates allowed, approval-required, and denied Stripe refund
            requests.
          </p>
          <code className="mt-4 block rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100">
            pnpm smoke:action-request
          </code>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Refund review smoke test
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Creates reviewable refunds, then approves one and rejects one.
          </p>
          <code className="mt-4 block rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100">
            pnpm smoke:approval-flow
          </code>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Dry-run refund smoke test
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Approves a refund, executes it in dry_run mode, then checks
            duplicate execution is blocked.
          </p>
          <code className="mt-4 block rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100">
            pnpm smoke:execution-flow
          </code>
        </section>
      </div>
    </section>
  );
}
