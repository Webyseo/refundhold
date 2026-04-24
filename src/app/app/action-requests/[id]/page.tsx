import Link from "next/link";
import { notFound } from "next/navigation";

import {
  approveActionRequestFromDashboard,
  executeActionRequestFromDashboard,
  rejectActionRequestFromDashboard,
} from "@/app/app/actions";
import { getDashboardActionRequest } from "@/lib/dashboard/data";
import {
  formatDateTime,
  formatJson,
  getActionRequestControls,
  getDecisionLabel,
  getStatusLabel,
} from "@/lib/dashboard/view-model";

export const dynamic = "force-dynamic";

export default async function ActionRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const notices = await searchParams;
  const request = await getDashboardActionRequest(id);

  if (!request) {
    notFound();
  }

  const controls = getActionRequestControls({
    decision: request.decision,
    status: request.status,
  });
  const success = getSearchMessage(notices["success"]);
  const error = getSearchMessage(notices["error"]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <Link
        href="/app/action-requests"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        Back to action requests
      </Link>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
            Action request
          </p>
          <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-zinc-950">
            {request.operation}
          </h1>
          <p className="mt-2 font-mono text-sm text-zinc-500">{request.id}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Pill>{getStatusLabel(request.status)}</Pill>
          <Pill>{getDecisionLabel(request.decision)}</Pill>
        </div>
      </div>

      {success ? <Notice tone="success">{success}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-950">Summary</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="Agent" value={request.agent.name} />
              <Detail
                label="Connector"
                value={
                  request.connector
                    ? `${request.connector.name} (${request.connector.type})`
                    : "none"
                }
              />
              <Detail
                label="Created"
                value={formatDateTime(request.createdAt)}
              />
              <Detail
                label="Updated"
                value={formatDateTime(request.updatedAt)}
              />
              <Detail label="Decision reason" value={request.decisionReason} />
              <Detail
                label="Decided"
                value={request.decidedAt ? formatDateTime(request.decidedAt) : null}
              />
            </dl>
          </section>

          <JsonSection title="Resource JSON" value={request.resource} />
          <JsonSection title="Parameters JSON" value={request.parameters} />
          <JsonSection title="Context JSON" value={request.context} />

          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-950">
              Approvals
            </h2>
            {request.approvals.length === 0 ? (
              <EmptyLine>No approvals recorded.</EmptyLine>
            ) : (
              <div className="mt-4 space-y-3">
                {request.approvals.map((approval) => (
                  <div
                    key={approval.id}
                    className="border-t border-zinc-100 py-4 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-950">
                        {approval.status}
                      </p>
                      <p className="font-mono text-xs text-zinc-500">
                        {approval.id}
                      </p>
                    </div>
                    <p className="mt-2 text-sm text-zinc-600">
                      Reviewer:{" "}
                      {approval.reviewer?.email ?? "unknown reviewer"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-600">
                      Reason: {approval.reason ?? "none"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {approval.reviewedAt
                        ? formatDateTime(approval.reviewedAt)
                        : formatDateTime(approval.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-950">
              Executions
            </h2>
            {request.executions.length === 0 ? (
              <EmptyLine>No executions recorded.</EmptyLine>
            ) : (
              <div className="mt-4 space-y-3">
                {request.executions.map((execution) => (
                  <div
                    key={execution.id}
                    className="border-t border-zinc-100 py-4 first:border-t-0 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-950">
                        {execution.status} / {execution.mode}
                      </p>
                      <p className="font-mono text-xs text-zinc-500">
                        {execution.id}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      Started:{" "}
                      {execution.startedAt
                        ? formatDateTime(execution.startedAt)
                        : "not recorded"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      Completed:{" "}
                      {execution.completedAt
                        ? formatDateTime(execution.completedAt)
                        : "not recorded"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-950">
              Review actions
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              These actions use the existing AuthRail API logic and the
              demo-only reviewer identity from the local environment.
            </p>

            {controls.canApprove || controls.canReject ? (
              <div className="mt-4 space-y-3">
                <form action={approveActionRequestFromDashboard}>
                  <input
                    type="hidden"
                    name="actionRequestId"
                    value={request.id}
                  />
                  <textarea
                    name="comment"
                    className="min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Optional approval comment"
                  />
                  <button
                    type="submit"
                    className="mt-2 w-full rounded-md bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Approve
                  </button>
                </form>
                <form action={rejectActionRequestFromDashboard}>
                  <input
                    type="hidden"
                    name="actionRequestId"
                    value={request.id}
                  />
                  <textarea
                    name="comment"
                    className="min-h-24 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                    placeholder="Optional rejection comment"
                  />
                  <button
                    type="submit"
                    className="mt-2 w-full rounded-md bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800"
                  >
                    Reject
                  </button>
                </form>
              </div>
            ) : null}

            {controls.canExecute ? (
              <form action={executeActionRequestFromDashboard} className="mt-4">
                <input
                  type="hidden"
                  name="actionRequestId"
                  value={request.id}
                />
                <button
                  type="submit"
                  className="w-full rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Execute dry-run
                </button>
              </form>
            ) : null}

            {!controls.canApprove &&
            !controls.canReject &&
            !controls.canExecute ? (
              <p className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
                No dashboard action is available for this request state.
              </p>
            ) : null}
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-950">
              Audit timeline
            </h2>
            {request.auditEvents.length === 0 ? (
              <EmptyLine>No audit events recorded.</EmptyLine>
            ) : (
              <ol className="mt-4 space-y-4">
                {request.auditEvents.map((event) => (
                  <li key={event.id} className="border-l-2 border-zinc-200 pl-4">
                    <p className="text-sm font-semibold text-zinc-950">
                      {event.type}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatDateTime(event.createdAt)} / {event.actorType}
                    </p>
                    <pre className="mt-2 max-h-48 overflow-auto rounded-md bg-zinc-950 p-3 text-xs leading-5 text-zinc-100">
                      {formatJson(event.metadata)}
                    </pre>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm text-zinc-900">{value ?? "none"}</dd>
    </div>
  );
}

function JsonSection({ title, value }: { title: string; value: unknown }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-950">{title}</h2>
      <pre className="mt-4 overflow-auto rounded-md bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">
        {formatJson(value)}
      </pre>
    </section>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-sm font-semibold capitalize text-zinc-700">
      {children}
    </span>
  );
}

function Notice({
  tone,
  children,
}: {
  tone: "success" | "error";
  children: React.ReactNode;
}) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : "border-red-200 bg-red-50 text-red-900";

  return (
    <div className={`mt-5 rounded-md border px-4 py-3 text-sm ${styles}`}>
      {children}
    </div>
  );
}

function EmptyLine({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-sm text-zinc-500">{children}</p>;
}

function getSearchMessage(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
