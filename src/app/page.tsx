export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-50">
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col justify-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
          RefundHold
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          RefundHold holds AI-initiated Stripe refunds until a rule or a human
          approves them.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          RefundHold is a control layer for Stripe refunds initiated, prepared,
          or recommended by AI agents. It applies rules, holds risky cases,
          requests human approval when needed, and records audit evidence.
        </p>
        <div className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/70 p-5">
          <p className="text-sm font-medium text-zinc-100">Demo scope</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            The backend can evaluate refund requests, record approvals, and
            perform dry-run refund execution. This demo does not call Stripe
            APIs and does not move real money. The dashboard is available at{" "}
            <a className="text-emerald-300 hover:text-emerald-200" href="/app">
              /app
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
