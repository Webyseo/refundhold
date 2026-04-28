import Link from "next/link";

export default function DashboardHomePage() {
  const flowSteps = [
    {
      title: "High-risk refund held",
      body: "AI support can propose a refund, but risky requests are held before execution.",
    },
    {
      title: "Human approval required",
      body: "RefundHold turns policy results into a clear reviewer decision point.",
    },
    {
      title: "Dry-run refund execution",
      body: "Approved demo refunds can be simulated without calling Stripe or moving money.",
    },
    {
      title: "Audit evidence recorded",
      body: "Every proposal, policy decision, review, and dry_run execution is recorded.",
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

      <div className="mt-10 grid gap-3 lg:grid-cols-4">
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

      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            High-risk refund held
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            See a proposed refund pause before it can reach any payment
            execution path.
          </p>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Human approval required
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Reviewers get a focused decision with policy reason, risk context,
            and the next safe action.
          </p>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Dry-run refund execution
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Executions stay in dry_run for the demo. RefundHold records the
            control path without moving real money.
          </p>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Audit evidence recorded
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            The timeline shows proposal, policy, approval, rejection, and
            dry_run execution evidence for the walkthrough.
          </p>
        </section>
      </div>
    </section>
  );
}
