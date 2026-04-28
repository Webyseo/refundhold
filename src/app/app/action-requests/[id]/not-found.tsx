import Link from "next/link";

export default function ActionRequestNotFound() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
        Refund request not found
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-zinc-950">
        This refund request is not available in the local demo database.
      </h1>
      <p className="mt-4 text-sm leading-6 text-zinc-600">
        Go back to the queue to choose an available demo refund request. If the
        queue is empty, confirm the RefundHold demo seed has run.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/app/action-requests"
          className="rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Back to refund requests
        </Link>
      </div>
    </section>
  );
}
