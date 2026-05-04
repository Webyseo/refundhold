import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAccessNotice } from "./access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";
import { listDashboardActionRequests } from "@/lib/dashboard/data";
import { sortDashboardActionRequestsForReview } from "@/lib/dashboard/view-model";

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

  const requests = await listDashboardActionRequests({
    organizationId: access.context.organizationId,
  });
  const reviewHref = getPrimaryReviewHref(requests);

  return <DashboardHomeContent reviewHref={reviewHref} />;
}

export function DashboardHomeContent({
  reviewHref = "/app/refund-requests",
}: {
  reviewHref?: string;
}) {
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
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
            Refund review
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-50">
            3 refunds need your review
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
            These AI-proposed Stripe refunds are waiting for a human decision
            before they can continue.
          </p>

          <div className="mt-6 rounded-lg border border-emerald-300/20 bg-emerald-300/10 p-4 text-sm leading-6 text-emerald-50">
            <p className="font-semibold text-emerald-100">Demo simulation</p>
            <p className="mt-1">
              No live Stripe money moves. RefundHold records reviewer decisions
              and audit trail events for this private demo.
            </p>
          </div>

          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-zinc-50">
                  Refund request
                </p>
                <p className="mt-2 w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-900">
                  Needs review
                </p>
              </div>
              <p className="text-sm font-medium text-zinc-400">
                AI-proposed Stripe refund
              </p>
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <DashboardDetail label="Amount" value="$420" />
              <DashboardDetail label="Status" value="Needs review" />
              <DashboardDetail
                label="Policy"
                value="Human approval required"
              />
              <DashboardDetail
                label="Reason"
                value="AI support agent detected possible duplicate billing"
              />
              <DashboardDetail
                label="Requested by"
                value="AI support agent"
              />
            </dl>

            <Link
              href={reviewHref}
              className="mt-6 inline-flex min-h-11 items-center rounded-md bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Review refund
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-50">
            Want to test setup?
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Walk through the demo setup rules and review flow.
          </p>
          <Link
            href="/app/onboarding"
            className="mt-5 inline-flex min-h-11 items-center rounded-md border border-zinc-700 px-3 py-2 text-sm font-semibold text-zinc-200 hover:border-zinc-500 hover:bg-zinc-800 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Start onboarding
          </Link>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {summaries.map((summary) => (
          <div
            key={summary.label}
            className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
          >
            <p className="text-3xl font-semibold tracking-tight text-zinc-50">
              {summary.value}
            </p>
            <h2 className="mt-2 text-sm font-semibold text-zinc-300">
              {summary.label}
            </h2>
          </div>
        ))}
      </div>
    </section>
  );
}

function getPrimaryReviewHref(
  requests: Awaited<ReturnType<typeof listDashboardActionRequests>>,
): string {
  const [primaryRequest] = sortDashboardActionRequestsForReview(requests);

  return primaryRequest
    ? `/app/refund-requests/${primaryRequest.id}`
    : "/app/refund-requests";
}

function DashboardDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/70 p-3">
      <dt className="sr-only">{label}</dt>
      <dd className="text-sm font-semibold text-zinc-100">
        {label}: {value}
      </dd>
    </div>
  );
}
