import Link from "next/link";

import { listDashboardActionRequests } from "@/lib/dashboard/data";
import {
  filterActionRequestsByDashboardStatus,
  formatDateTime,
  getDecisionLabel,
  getImpactSummary,
  getRequestFilterCounts,
  getStatusLabel,
  sortDashboardActionRequestsForReview,
  type DashboardDecision,
  type DashboardRequestFilter,
  type DashboardStatus,
} from "@/lib/dashboard/view-model";

export const dynamic = "force-dynamic";

const filters = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "executed", label: "Executed" },
] satisfies { value: DashboardRequestFilter; label: string }[];

export default async function ActionRequestsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const selectedFilter = parseRequestFilter(query["status"]);
  const actionRequests = await listDashboardActionRequests();
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
            Action requests
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Pending review items are sorted first so the demo reviewer can see
            the next sensitive AI-agent action immediately.
          </p>
        </div>
        <p className="text-sm text-zinc-500">
          Showing {filteredActionRequests.length} of {actionRequests.length}{" "}
          requests.
        </p>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Action request filters">
        {filters.map((filter) => {
          const active = selectedFilter === filter.value;

          return (
            <Link
              key={filter.value}
              href={
                filter.value === "all"
                  ? "/app/action-requests"
                  : `/app/action-requests?status=${filter.value}`
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
              No action requests match this view.
            </p>
            <p className="mt-2 leading-6">
              Run <code className="font-mono">pnpm smoke:action-request</code>,{" "}
              <code className="font-mono">pnpm smoke:approval-flow</code>, or{" "}
              <code className="font-mono">pnpm smoke:execution-flow</code> to
              generate demo records.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Attention</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Impact</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Connector</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredActionRequests.map((request) => {
                  const isPendingReview =
                    request.decision === "APPROVAL_REQUIRED" &&
                    request.status === "APPROVAL_REQUIRED";

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
                            No action
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-4 py-3">
                        <DecisionBadge decision={request.decision} />
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {getImpactSummary({
                          operation: request.operation,
                          parameters: request.parameters,
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-950">
                        {request.agent.name}
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {request.connector?.name ?? "none"}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/app/action-requests/${request.id}`}
                          className="font-mono text-emerald-700 hover:text-emerald-900"
                        >
                          {request.operation}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">
                        {formatDateTime(request.createdAt)}
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}
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
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}
    >
      {getDecisionLabel(decision)}
    </span>
  );
}
