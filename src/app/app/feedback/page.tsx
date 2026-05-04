import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAccessNotice } from "../access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";

export const dynamic = "force-dynamic";

const feedbackMailto =
  "mailto:hello@refundhold.com?subject=RefundHold%20private%20demo%20feedback";

export default async function FeedbackPage() {
  const access = await getAppAccessContext({
    nextPath: "/app/feedback",
  });

  if (!access.ok) {
    if (access.reason === "auth_required") {
      redirect(access.redirectTo);
    }

    return <AppAccessNotice message={access.message} />;
  }

  return <FeedbackContent />;
}

export function FeedbackContent() {
  return (
    <section className="mx-auto max-w-4xl px-5 py-8 sm:px-8">
      <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
        Private demo feedback
      </p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50">
        Send feedback
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
        Tell us what was unclear in the private demo.
      </p>

      <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
        <div className="grid gap-4">
          <label className="block">
            <span className="text-sm font-semibold text-zinc-100">
              What was confusing?
            </span>
            <textarea
              className="mt-2 min-h-28 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-emerald-300"
              placeholder="Example: I was not sure what happens after approval."
              readOnly
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-100">
              What were you trying to do?
            </span>
            <textarea
              className="mt-2 min-h-24 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-emerald-300"
              placeholder="Example: Review a held refund and inspect the audit trail."
              readOnly
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-zinc-100">
              Optional email
            </span>
            <input
              className="mt-2 min-h-11 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-500 focus-visible:ring-2 focus-visible:ring-emerald-300"
              placeholder="you@example.com"
              readOnly
              type="email"
            />
          </label>
        </div>

        <div
          aria-live="polite"
          className="mt-5 rounded-md border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm leading-6 text-amber-100"
        >
          Feedback capture is not connected in this demo. Email{" "}
          <a
            className="font-semibold text-amber-50 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            href={feedbackMailto}
          >
            hello@refundhold.com
          </a>
          .
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <a
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            href={feedbackMailto}
          >
            Email RefundHold
          </a>
          <Link
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            href="/app/refund-requests"
          >
            Back to refund requests
          </Link>
        </div>
      </div>
    </section>
  );
}
