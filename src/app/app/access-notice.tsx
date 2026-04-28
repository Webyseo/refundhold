import Link from "next/link";

export function AppAccessNotice({ message }: { message: string }) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
        Access unavailable
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
        RefundHold could not open this dashboard.
      </h1>
      <p className="mt-4 text-sm leading-6 text-zinc-600">{message}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Go to login
        </Link>
        <Link
          href="/demo-access"
          className="rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-100"
        >
          Use demo access
        </Link>
      </div>
    </section>
  );
}
