import Link from "next/link";

export default function DashboardHomePage() {
  return (
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
          Review console
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          Review and control sensitive AI-agent actions.
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-600">
          This minimal dashboard reads real action requests from Postgres,
          lets the demo reviewer approve or reject pending requests, and can
          trigger dry-run execution for approved requests.
        </p>
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/app/action-requests"
          className="rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Open action requests
        </Link>
        <Link
          href="/"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
        >
          Product summary
        </Link>
      </div>

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">Pending review</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Requests that require approval can be approved or rejected by the
            demo reviewer.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">Dry-run execute</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Approved requests can be executed in dry-run mode without calling
            Stripe or any external system.
          </p>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <p className="text-sm font-semibold text-zinc-950">Audit trail</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            Request, policy, approval, and execution events are shown as a
            timeline on each detail page.
          </p>
        </div>
      </div>
    </section>
  );
}
