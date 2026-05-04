import Link from "next/link";

export default function ActionRequestNotFound() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
        Refund request not found
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-50">
        This refund request is not available in the private demo.
      </h1>
      <p className="mt-4 text-sm leading-6 text-zinc-300">
        Go back to the queue to choose an available demo refund request.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/app/refund-requests"
          className="rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
        >
          Back to refund requests
        </Link>
      </div>
    </section>
  );
}
