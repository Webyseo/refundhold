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
  getRequestFilterCounts,
  getStatusLabel,
  sortDashboardActionRequestsForReview,
  type DashboardDecision,
  type DashboardRequestFilter,
  type DashboardStatus,
} from "@/lib/dashboard/view-model";

export const dynamic = "force-dynamic";

const filters = [
  { value: "all", label: "All refunds" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "executed", label: "Executed" },
] satisfies { value: DashboardRequestFilter; label: string }[];

type RefundRequestsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  routeBase?: "/app/action-requests" | "/app/refund-requests";
};

export default async function ActionRequestsPage({
  searchParams,
}: RefundRequestsPageProps) {
  return RefundRequestsPage({ searchParams, routeBase: "/app/action-requests" });
}

export async function RefundRequestsPage({
  searchParams,
  routeBase = "/app/action-requests",
}: RefundRequestsPageProps) {
  const query = await searchParams;
  const selectedFilter = parseRequestFilter(query["status"]);
  const access = await getAppAccessContext({
    nextPath: getRefundRequestsNextPath(selectedFilter, routeBase),
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
  const filteredActionRequests = filterActionRequestsByDashboardStatus(
    sortedActionRequests,
    selectedFilter,
  );
  const counts = getRequestFilterCounts(actionRequests);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
            Queue
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Refund requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Review Stripe refunds proposed by AI agents before they continue.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          Showing {filteredActionRequests.length} of {actionRequests.length}{" "}
          refund requests.
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Refund request filters">
        {filters.map((filter) => {
          const active = selectedFilter === filter.value;

          return (
            <Link
              key={filter.value}
              href={
                filter.value === "all"
                  ? routeBase
                  : `${routeBase}?status=${filter.value}`
              }
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                active
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              {filter.label}
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs ${
                  active ? "bg-white/15 text-white" : "bg-zinc-100 text-zinc-600"
                }`}
              >
                {counts[filter.value]}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {filteredActionRequests.length === 0 ? (
          <div className="p-8 text-sm text-zinc-600">
            <p className="font-semibold text-zinc-950">
              No refund requests match this view.
            </p>
            <p className="mt-2 leading-6">
              The hosted demo seed should provide reviewable refund requests.
              Switch filters or confirm the RefundHold demo seed has run.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Attention</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">AI support agent</th>
                  <th className="px-4 py-3">Payment system</th>
                  <th className="px-4 py-3">Refund type</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
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

                  return (
                    <tr
                      key={request.id}
                      className={
                        isPendingReview
                          ? "bg-amber-50/50 hover:bg-amber-50"
                          : "hover:bg-stone-50"
                      }
                    >
                      <td className="px-4 py-3">
                        {isPendingReview ? (
                          <span className="inline-flex rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
                            Needs review
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-zinc-400">
                            No review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {amount}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-4 py-3">
                        <DecisionBadge decision={request.decision} />
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {request.agent.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        <span className="font-medium text-zinc-950">
                          {stripeModeLabel}
                        </span>
                        <span className="block text-xs text-zinc-500">
                          {isStripeTest
                            ? "test mode; no live money movement"
                            : "Demo simulation; no Stripe call"}
                        </span>
                        <IndicatorBadges labels={indicators} />
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        Stripe refund
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {formatDateTime(request.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`${routeBase}/${request.id}`}
                          className={`inline-flex rounded-md px-3 py-2 text-xs font-semibold ${
                            isPendingReview
                              ? "bg-zinc-950 text-white hover:bg-zinc-800"
                              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
                          }`}
                        >
                          {isPendingReview ? "Review" : "View details"}
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
): DashboardRequestFilter {
  const rawValue = Array.isArray(value) ? value[0] : value;

  return filters.some((filter) => filter.value === rawValue)
    ? (rawValue as DashboardRequestFilter)
    : "all";
}

function StatusBadge({ status }: { status: DashboardStatus }) {
  const styles =
    status === "APPROVAL_REQUIRED"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : status === "APPROVED" || status === "EXECUTED"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : status === "DENIED" || status === "REJECTED" || status === "FAILED"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function DecisionBadge({ decision }: { decision: DashboardDecision }) {
  const styles =
    decision === "APPROVAL_REQUIRED"
      ? "border-amber-200 bg-amber-50 text-amber-900"
      : decision === "ALLOW"
        ? "border-emerald-200 bg-emerald-50 text-emerald-900"
        : decision === "DENY"
          ? "border-red-200 bg-red-50 text-red-900"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}
    >
      {getDecisionLabel(decision)}
    </span>
  );
}

function IndicatorBadges({ labels }: { labels: string[] }) {
  return (
    <div className="mt-2 flex max-w-56 flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] font-semibold text-zinc-600"
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
