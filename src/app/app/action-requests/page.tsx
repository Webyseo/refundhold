import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAccessNotice } from "../access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";
import { listDashboardActionRequests } from "@/lib/dashboard/data";
import {
  filterActionRequestsByDashboardStatus,
  formatRefundRequestAmount,
  formatDateTime,
  getDecisionLabel,
  getImpactSummary,
  getQueueIndicators,
  getRefundReviewDisplay,
  getRequestFilterCounts,
  getStatusLabel,
  sortDashboardActionRequestsForReview,
  type DashboardDecision,
  type DashboardRequestFilter,
  type DashboardStatus,
} from "@/lib/dashboard/view-model";

export const dynamic = "force-dynamic";

export const refundRequestFilters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "executed", label: "Executed" },
  { value: "failed", label: "Failed" },
] satisfies { value: DashboardRequestFilter; label: string }[];

type RefundRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  routeBase?: "/app/action-requests" | "/app/refund-requests";
};

export default async function ActionRequestsPage({
  searchParams,
}: RefundRequestsPageProps) {
  return RefundRequestsPage({ searchParams, routeBase: "/app/refund-requests" });
}

export async function RefundRequestsPage({
  searchParams,
  routeBase = "/app/action-requests",
}: RefundRequestsPageProps) {
  const query = await searchParams;
  const requestedFilter = parseRequestFilter(query["status"]);
  const access = await getAppAccessContext({
    nextPath: getRefundRequestsNextPath(requestedFilter ?? "all", routeBase),
  });

  if (!access.ok) {
    if (access.reason === "auth_required") {
      redirect(access.redirectTo);
    }

    return <AppAccessNotice message={access.message} />;
  }

  const actionRequests = await listDashboardActionRequests({
    organizationId: access.context.organizationId,
  });
  const sortedActionRequests =
    sortDashboardActionRequestsForReview(actionRequests);
  const counts = getRequestFilterCounts(actionRequests);
  const selectedFilter = getEffectiveRequestFilter({
    requestedFilter,
    counts,
  });
  const filteredActionRequests = filterActionRequestsByDashboardStatus(
    sortedActionRequests,
    selectedFilter,
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
            Queue
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Refund requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">
            Review Stripe refunds proposed by AI agents before they continue.
          </p>
        </div>
        <p className="text-sm text-zinc-400">
          Showing {filteredActionRequests.length} of {actionRequests.length}{" "}
          refund requests.
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Refund request filters">
        {refundRequestFilters.map((filter) => {
          const active = selectedFilter === filter.value;

          return (
            <Link
              aria-current={active ? "page" : undefined}
              key={filter.value}
              href={
                filter.value === "all"
                  ? routeBase
                  : `${routeBase}?status=${filter.value}`
              }
              className={`rounded-md border px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                active
                  ? "border-emerald-400/70 bg-emerald-400 text-zinc-950"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
              }`}
            >
              {filter.label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  active
                    ? "bg-zinc-950/15 text-zinc-950"
                    : "bg-zinc-800 text-zinc-300"
                }`}
              >
                {counts[filter.value]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
        {filteredActionRequests.length === 0 ? (
          <RefundRequestsEmptyState
            hasAnyRequests={actionRequests.length > 0}
            routeBase={routeBase}
            selectedFilter={selectedFilter}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-800 text-left text-sm">
              <thead className="bg-zinc-900 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Policy result</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Requested by</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredActionRequests.map((request) => {
                  const isPendingReview =
                    request.decision === "APPROVAL_REQUIRED" &&
                    request.status === "APPROVAL_REQUIRED";
                  const indicators = getQueueIndicators(request);
                  const isStripeTest = indicators.includes("Stripe test-mode");
                  const amount =
                    formatRefundRequestAmount(request.parameters) ??
                    getImpactSummary({
                      operation: request.operation,
                      parameters: request.parameters,
                    });
                  const stripeModeLabel = getStripeModeLabel({
                    connectorType: request.connector?.type,
                    isStripeTest,
                  });
                  const reviewDisplay = getRefundReviewDisplay(request);
                  const customer = getReadableDetailValue(
                    reviewDisplay.customerContext,
                    "Customer",
                  );
                  const policyResult = getPolicyResultLabel(request.decision);
                  const nextAction = getShortNextActionLabel(request);

                  return (
                    <tr
                      key={request.id}
                      className={
                        isPendingReview
                          ? "bg-amber-950/20 hover:bg-amber-950/30"
                          : "hover:bg-zinc-900"
                      }
                    >
                      <td className="px-4 py-3 font-medium text-zinc-50">
                        {amount}
                      </td>
                      <td className="max-w-64 px-4 py-3 text-zinc-300">
                        <span className="font-medium text-zinc-50">
                          {customer ?? "Customer context not recorded"}
                        </span>
                        <span className="mt-1 block text-xs text-zinc-400">
                          Stripe refund
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-200">
                          {policyResult}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={request.status} />
                        <span className="mt-2 block text-xs text-zinc-400">
                          {stripeModeLabel}
                        </span>
                        <span className="block text-xs text-zinc-400">
                          {isStripeTest
                            ? "test mode; no live money movement"
                            : "Demo simulation; no Stripe call"}
                        </span>
                        <IndicatorBadges labels={indicators} />
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-100">
                        {request.agent.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-400">
                        {formatDateTime(request.createdAt)}
                      </td>
                      <td className="max-w-64 px-4 py-3">
                        <p className="text-sm leading-6 text-zinc-200">
                          {nextAction}
                        </p>
                        <Link
                          href={`${routeBase}/${request.id}`}
                          className={`mt-3 inline-flex rounded-md px-3 py-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                            isPendingReview
                              ? "bg-emerald-400 text-zinc-950 hover:bg-emerald-300"
                              : "border border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"
                          }`}
                        >
                          View details
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function getRefundRequestsNextPath(
  filter: DashboardRequestFilter,
  routeBase: NonNullable<RefundRequestsPageProps["routeBase"]>,
): string {
  return filter === "all" ? routeBase : `${routeBase}?status=${filter}`;
}

function parseRequestFilter(
  value: string | string[] | undefined,
): DashboardRequestFilter | null {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return refundRequestFilters.some((filter) => filter.value === rawValue)
    ? (rawValue as DashboardRequestFilter)
    : null;
}

export function getEffectiveRequestFilter({
  requestedFilter,
  counts,
}: {
  requestedFilter: DashboardRequestFilter | null;
  counts: Record<DashboardRequestFilter, number>;
}): DashboardRequestFilter {
  if (requestedFilter) {
    return requestedFilter;
  }

  return counts.pending > 0 ? "pending" : "all";
}

export function getShortNextActionLabel(request: {
  decision: DashboardDecision;
  status: DashboardStatus;
}): string {
  if (
    request.decision === "APPROVAL_REQUIRED" &&
    request.status === "APPROVAL_REQUIRED"
  ) {
    return "Review required";
  }

  if (request.status === "APPROVED") {
    return "Ready to record execution";
  }

  if (request.status === "REJECTED" || request.status === "DENIED") {
    return "Rejected - no action";
  }

  if (request.status === "EXECUTED") {
    return "Executed - audit available";
  }

  if (request.status === "FAILED") {
    return "Failed - review details";
  }

  return "View audit details";
}

export function RefundRequestsEmptyState({
  hasAnyRequests = false,
  routeBase = "/app/refund-requests",
  selectedFilter = "all",
}: {
  hasAnyRequests?: boolean;
  routeBase?: "/app/action-requests" | "/app/refund-requests";
  selectedFilter?: DashboardRequestFilter;
}) {
  if (hasAnyRequests && selectedFilter !== "all") {
    return (
      <div className="p-8 text-sm text-zinc-300">
        <p className="font-semibold text-zinc-50">
          No refunds match this filter
        </p>
        <p className="mt-2 leading-6 text-zinc-400">
          There are no refund requests in this status. Switch to All to see
          every demo request.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          href={routeBase}
        >
          Show all refund requests
        </Link>
      </div>
    );
  }

  return (
    <div className="p-8 text-sm text-zinc-300">
      <p className="font-semibold text-zinc-50">No refund requests yet</p>
      <p className="mt-2 leading-6 text-zinc-400">
        Create a demo request or read the API quickstart.
      </p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          href="/app/onboarding"
        >
          Create demo refund request
        </Link>
        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          href="/docs/quickstart"
        >
          View API quickstart
        </Link>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: DashboardStatus }) {
  const styles =
    status === "APPROVAL_REQUIRED"
      ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
      : status === "APPROVED" || status === "EXECUTED"
        ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-100"
        : status === "DENIED" || status === "REJECTED" || status === "FAILED"
          ? "border-red-300/50 bg-red-300/15 text-red-100"
          : "border-zinc-700 bg-zinc-900 text-zinc-200";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function getPolicyResultLabel(decision: DashboardDecision): string {
  if (decision === "APPROVAL_REQUIRED") {
    return "Human approval required";
  }

  return getDecisionLabel(decision);
}

function getReadableDetailValue(
  items: Array<{ label: string; value: string }>,
  label: string,
): string | null {
  return items.find((item) => item.label === label)?.value ?? null;
}

function IndicatorBadges({ labels }: { labels: string[] }) {
  return (
    <div className="mt-2 flex max-w-56 flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-[11px] font-semibold text-zinc-300"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function getStripeModeLabel({
  connectorType,
  isStripeTest,
}: {
  connectorType: string | undefined;
  isStripeTest: boolean;
}): string {
  if (connectorType === "stripe_test" || isStripeTest) {
    return "Stripe test-mode";
  }

  return "Demo simulation";
}
