import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAccessNotice } from "./access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";

export const dynamic = "force-dynamic";

export default async function DashboardHomePage() {
  const access = await getAppAccessContext({
    nextPath: "/app",
  });

  if (!access.ok) {
    if (access.reason === "auth_required") {
      redirect(access.redirectTo);
    }

    return <AppAccessNotice message={access.message} />;
  }

  return <DashboardHomeContent />;
}

export function DashboardHomeContent() {
  const summaries = [
    { label: "Pending review", value: "3" },
    { label: "Approved", value: "2" },
    { label: "Rejected", value: "1" },
    { label: "Executed", value: "0" },
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
            Refund review
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-950">
            3 refunds need your review
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
            These AI-proposed Stripe refunds are waiting for a human decision
            before they can continue.
          </p>

          <div className="mt-8 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-950">
                  Refund request
                </p>
                <p className="mt-2 w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                  Needs review
                </p>
              </div>
              <p className="text-sm font-medium text-zinc-500">
                AI-proposed Stripe refund
              </p>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <DashboardDetail label="Amount" value="$420" />
              <DashboardDetail
                label="Policy"
                value="Human approval required"
              />
              <DashboardDetail
                label="Reason"
                value="AI support agent detected possible duplicate billing"
              />
            </dl>

            <Link
              href="/app/refund-requests?status=pending"
              className="mt-6 inline-flex rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
            >
              Review refund
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-950">Demo simulation</p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            No live Stripe money moves. Review decisions and the Audit trail are
            recorded for the demo refund flow.
          </p>
          <Link
            href="/app/onboarding"
            className="mt-5 inline-flex rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2"
          >
            Start onboarding
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaries.map((summary) => (
          <div
            key={summary.label}
            className="rounded-lg border border-zinc-200 bg-white p-4"
          >
            <p className="text-3xl font-semibold tracking-tight text-zinc-950">
              {summary.value}
            </p>
            <h2 className="mt-2 text-sm font-semibold text-zinc-700">
              {summary.label}
            </h2>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <dt className="sr-only">{label}</dt>
      <dd className="text-sm font-semibold text-zinc-950">
        {label}: {value}
      </dd>
    </div>
  );
}
