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
  getImpactSummary,
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
  const impactSummary = getImpactSummary({
    operation: request.operation,
    parameters: request.parameters,
  });
  const demoDetails = getDemoRefundDetails({
    parameters: request.parameters,
    context: request.context,
  });
  const success = getSearchMessage(notices["success"]);
  const error = getSearchMessage(notices["error"]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <Link
        href="/app/action-requests"
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        Back to refund requests
      </Link>

      <div className="mt-5 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
            Refund request
          </p>
          <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-zinc-950">
            {request.operation}
          </h1>
          <p className="mt-2 font-mono text-sm text-zinc-500">{request.id}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-80">
          <StatePanel label="Current status" value={getStatusLabel(request.status)} />
          <StatePanel label="Policy decision" value={getDecisionLabel(request.decision)} />
        </div>
      </div>

      {success ? <Notice tone="success">{success}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-lg border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-950">
              Review focus
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-amber-950">
              {impactSummary}
            </h2>
            <p className="mt-3 text-sm leading-6 text-amber-900">
              {request.decisionReason ??
                "No policy reason was recorded for this request."}
            </p>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-5">
            <h2 className="text-base font-semibold text-zinc-950">Summary</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <Detail label="AI support agent" value={request.agent.name} />
              <Detail
                label="Payment system"
                value={
                  request.connector
                    ? `${request.connector.name} (${request.connector.type})`
                    : "none"
                }
              />
              <Detail label="Refund amount" value={demoDetails.refundAmount} />
              <Detail label="Customer context" value={demoDetails.customer} />
              <Detail label="Order context" value={demoDetails.order} />
              <Detail label="AI initiated action" value={request.operation} />
              <Detail label="Dry-run guarantee" value={demoDetails.dryRun} />
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

          <JsonSection title="Refund resource JSON" value={request.resource} />
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
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Dry-run executions are simulations only. RefundHold does not call
              Stripe from this dashboard. This demo does not move real money.
            </p>
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
              Available refund action
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              These controls use demo review logic and the demo-only reviewer
              identity from the hosted environment.
            </p>

            {controls.canApprove || controls.canReject ? (
              <div className="mt-4 space-y-4">
                <form
                  action={approveActionRequestFromDashboard}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
                >
                  <input
                    type="hidden"
                    name="actionRequestId"
                    value={request.id}
                  />
                  <label
                    htmlFor="approval-comment"
                    className="text-sm font-semibold text-emerald-950"
                  >
                    Approve this dry_run refund review
                  </label>
                  <p className="mt-1 text-sm leading-6 text-emerald-900">
                    This records approval for the demo scenario only. It does
                    not create a real Stripe refund.
                  </p>
                  <textarea
                    id="approval-comment"
                    name="comment"
                    className="mt-3 min-h-24 w-full rounded-md border border-emerald-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                    placeholder="Optional approval comment"
                  />
                  <button
                    type="submit"
                    className="mt-2 w-full rounded-md bg-emerald-700 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-800"
                  >
                    Approve demo refund review
                  </button>
                </form>
                <form
                  action={rejectActionRequestFromDashboard}
                  className="rounded-lg border border-red-200 bg-red-50 p-4"
                >
                  <input
                    type="hidden"
                    name="actionRequestId"
                    value={request.id}
                  />
                  <label
                    htmlFor="rejection-comment"
                    className="text-sm font-semibold text-red-950"
                  >
                    Reject and block this dry_run refund
                  </label>
                  <p className="mt-1 text-sm leading-6 text-red-900">
                    This records a demo rejection and keeps the simulated refund
                    blocked.
                  </p>
                  <textarea
                    id="rejection-comment"
                    name="comment"
                    className="mt-3 min-h-24 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-sm text-zinc-950 outline-none focus:border-red-600 focus:ring-2 focus:ring-red-100"
                    placeholder="Optional rejection comment"
                  />
                  <button
                    type="submit"
                    className="mt-2 w-full rounded-md border border-red-300 bg-white px-4 py-3 text-sm font-semibold text-red-800 hover:bg-red-50"
                  >
                    Reject demo refund
                  </button>
                </form>
              </div>
            ) : null}

            {controls.canExecute ? (
              <form
                action={executeActionRequestFromDashboard}
                className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
              >
                <input
                  type="hidden"
                  name="actionRequestId"
                  value={request.id}
                />
                <p className="text-sm font-semibold text-emerald-950">
                  Approved and ready for simulation
                </p>
                <p className="mt-1 text-sm leading-6 text-emerald-900">
                  This creates a dry_run refund execution record only. This demo
                  does not move real money.
                </p>
                <button
                  type="submit"
                  className="mt-3 w-full rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
                >
                  Execute dry_run refund simulation
                </button>
              </form>
            ) : null}

            {!controls.canApprove &&
            !controls.canReject &&
            !controls.canExecute ? (
              <p className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
                No refund action is available for this request state.
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
              <ol className="mt-4 space-y-0">
                {request.auditEvents.map((event) => (
                  <li
                    key={event.id}
                    className="border-l-2 border-zinc-200 pb-5 pl-4 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-950">
                        {event.type}
                      </p>
                      <p className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-semibold text-zinc-600">
                        {event.actorType}
                      </p>
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatDateTime(event.createdAt)}
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

function StatePanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-semibold capitalize text-zinc-950">
        {value}
      </p>
    </div>
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

function getDemoRefundDetails({
  parameters,
  context,
}: {
  parameters: unknown;
  context: unknown;
}): {
  refundAmount: string | null;
  customer: string | null;
  order: string | null;
  dryRun: string | null;
} {
  const parameterRecord = isRecord(parameters) ? parameters : {};
  const contextRecord = isRecord(context) ? context : {};
  const amount = parameterRecord["amount"];
  const currency = parameterRecord["currency"];
  const customer = isRecord(contextRecord["customer"])
    ? contextRecord["customer"]
    : {};
  const order = isRecord(contextRecord["order"]) ? contextRecord["order"] : {};

  return {
    refundAmount:
      typeof amount === "number" && typeof currency === "string"
        ? `${amount} ${currency.toUpperCase()}`
        : null,
    customer: formatNamedValue({
      name: customer["name"],
      detail: customer["email"],
    }),
    order: formatNamedValue({
      name: order["id"],
      detail: order["summary"],
    }),
    dryRun:
      contextRecord["dry_run"] === true
        ? "dry_run=true; Stripe is not called and no money moves."
        : null,
  };
}

function formatNamedValue({
  name,
  detail,
}: {
  name: unknown;
  detail: unknown;
}): string | null {
  if (typeof name !== "string" || name.trim().length === 0) {
    return null;
  }

  return typeof detail === "string" && detail.trim().length > 0
    ? `${name} (${detail})`
    : name;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
