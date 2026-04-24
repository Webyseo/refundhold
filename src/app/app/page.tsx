import Link from "next/link";

export default function DashboardHomePage() {
  const flowSteps = [
    {
      title: "Request",
      body: "An AI agent asks AuthRail before taking a sensitive action.",
    },
    {
      title: "Policy decision",
      body: "AuthRail returns allow, deny, or approval required with a reason.",
    },
    {
      title: "Human review",
      body: "The demo reviewer approves or rejects requests that need judgment.",
    },
    {
      title: "Dry-run execution",
      body: "Approved requests can be simulated without touching Stripe or any external system.",
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
            Demo review console
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950">
            See which AI-agent action needs attention, why, and what can happen
            next.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            AuthRail sits between AI agents and sensitive execution surfaces.
            This dashboard is intentionally small: it shows the queue, the
            policy reason, the reviewer action, dry-run execution, and the audit
            evidence.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/app/action-requests?status=pending"
              className="rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Review pending requests
            </Link>
            <Link
              href="/app/action-requests"
              className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
            >
              View full queue
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm font-semibold text-amber-950">
            Demo mental model
          </p>
          <p className="mt-2 text-sm leading-6 text-amber-900">
            The reviewer is not managing identities. They are deciding whether a
            specific AI-agent action may proceed.
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
            Decision smoke test
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Creates allow, approval required, and deny refund requests.
          </p>
          <code className="mt-4 block rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100">
            pnpm smoke:action-request
          </code>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Human review smoke test
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Creates reviewable requests, then approves one and rejects one.
          </p>
          <code className="mt-4 block rounded-md bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100">
            pnpm smoke:approval-flow
          </code>
        </section>
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">
            Execution smoke test
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Approves a request, executes it in dry-run mode, then checks
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
