import Link from "next/link";

import { listDashboardActionRequests } from "@/lib/dashboard/data";
import {
  formatDateTime,
  getAmountCurrency,
  getDecisionLabel,
  getStatusLabel,
} from "@/lib/dashboard/view-model";

export const dynamic = "force-dynamic";

export default async function ActionRequestsPage() {
  const actionRequests = await listDashboardActionRequests();

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
        </div>
        <p className="text-sm text-zinc-500">
          Newest first. Showing latest {actionRequests.length} requests.
        </p>
      </div>

      <div className="mt-6 overflow-hidden rounded-lg border border-zinc-200 bg-white">
        {actionRequests.length === 0 ? (
          <div className="p-8 text-sm text-zinc-600">
            No action requests yet. Run the local smoke scripts to create demo
            records.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-zinc-200 text-left text-sm">
              <thead className="bg-zinc-50 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Decision</th>
                  <th className="px-4 py-3">Agent</th>
                  <th className="px-4 py-3">Connector</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {actionRequests.map((request) => {
                  const amountCurrency = getAmountCurrency(request.parameters);

                  return (
                    <tr key={request.id} className="hover:bg-stone-50">
                      <td className="px-4 py-3">
                        <StatusBadge status={request.status} />
                      </td>
                      <td className="px-4 py-3 text-zinc-700">
                        {getDecisionLabel(request.decision)}
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
                      <td className="px-4 py-3 text-zinc-700">
                        {amountCurrency.amount
                          ? `${amountCurrency.amount} ${amountCurrency.currency ?? ""}`
                          : "none"}
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

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === "APPROVAL_REQUIRED"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : status === "APPROVED" || status === "EXECUTED"
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : status === "DENIED" || status === "REJECTED" || status === "FAILED"
          ? "border-red-200 bg-red-50 text-red-800"
          : "border-zinc-200 bg-zinc-50 text-zinc-700";

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles}`}
    >
      {getStatusLabel(status as Parameters<typeof getStatusLabel>[0])}
    </span>
  );
}
