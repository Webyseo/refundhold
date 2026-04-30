import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ActionRequestControlsPanel } from "../action-request-controls";
import { AppAccessNotice } from "../../access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";
import { getDashboardActionRequest } from "@/lib/dashboard/data";
import {
  formatDateTime,
  formatJson,
  getActionRequestControls,
  getImpactSummary,
  getRefundReviewDisplay,
  getStripeTestRefundViewModel,
  type DashboardRefundReviewDisplay,
} from "@/lib/dashboard/view-model";

export const dynamic = "force-dynamic";

type RefundRequestDetailPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  routeBase?: "/app/action-requests" | "/app/refund-requests";
};

type RefundRequestDetail = NonNullable<
  Awaited<ReturnType<typeof getDashboardActionRequest>>
>;

type DemoRefundDetails = ReturnType<typeof getDemoRefundDetails>;

type StripeTestRefundDetails = ReturnType<typeof getStripeTestRefundViewModel>;

export default async function ActionRequestDetailPage({
  params,
  searchParams,
}: RefundRequestDetailPageProps) {
  return RefundRequestDetailPage({
    params,
    searchParams,
    routeBase: "/app/action-requests",
  });
}

export async function RefundRequestDetailPage({
  params,
  searchParams,
  routeBase = "/app/refund-requests",
}: RefundRequestDetailPageProps) {
  const { id } = await params;
  const notices = await searchParams;
  const access = await getAppAccessContext({
    nextPath: `${routeBase}/${id}`,
  });

  if (!access.ok) {
    if (access.reason === "auth_required") {
      redirect(access.redirectTo);
    }

    return <AppAccessNotice message={access.message} />;
  }

  const request = await getDashboardActionRequest({
    actionRequestId: id,
    organizationId: access.context.organizationId,
  });

  if (!request) {
    notFound();
  }

  const controls = getActionRequestControls({
    decision: request.decision,
    status: request.status,
  });
  const stripeTestRefund = getStripeTestRefundViewModel(request);
  const reviewDisplay = getRefundReviewDisplay(request);
  const impactSummary = getImpactSummary({
    operation: request.operation,
    parameters: request.parameters,
  });
  const demoDetails = getDemoRefundDetails({
    parameters: request.parameters,
    context: request.context,
  });
  const safetyLabel =
    reviewDisplay.modeLabel === "Stripe test-mode"
      ? "Stripe safety"
      : reviewDisplay.modeLabel;
  const safetyValue =
    reviewDisplay.modeLabel === "Stripe test-mode"
      ? "Test mode only; no live Stripe API calls and no real money movement."
      : reviewDisplay.modeLabel === "Live refunds blocked"
        ? "Live refunds are blocked in v1."
        : demoDetails.dryRun;
  const summarySentence = reviewDisplay.amount
    ? `AI support agent proposed a ${reviewDisplay.amount} Stripe refund.`
    : "AI support agent proposed a Stripe refund.";
  const success = getSearchMessage(notices["success"]);
  const error = getSearchMessage(notices["error"]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <Link
        href={routeBase}
        className="text-sm font-medium text-emerald-700 hover:text-emerald-900"
      >
        Back to refund requests
      </Link>

      <div className="mt-5">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
          Refund review
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-950">
          Refund request
        </h1>
      </div>

      {success ? <Notice tone="success">{success}</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}

      <div className="mt-6 space-y-6">
        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">Summary</h2>
          <div className="mt-3 space-y-2 text-sm leading-6 text-zinc-700">
            <p>{summarySentence}</p>
            <p>
              RefundHold evaluated the refund proposal against your refund
              policy before it could continue.
            </p>
          </div>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">
            What the AI agent says
          </h2>
          <p className="mt-3 text-sm leading-6 text-zinc-700">
            {reviewDisplay.aiJustification}
          </p>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">
            Customer and order context
          </h2>
          <ReadableDetails items={reviewDisplay.customerContext} />
        </section>

        <ActionRequestControlsPanel
          actionRequestId={request.id}
          controls={controls}
          permissions={access.context.permissions}
          returnPath={`${routeBase}/${request.id}`}
          stripeTestRefund={stripeTestRefund}
        />

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">
            Policy matched
          </h2>
          <ReadableDetails items={reviewDisplay.statusItems} />
          {reviewDisplay.policyDescription ? (
            <p className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
              {reviewDisplay.policyDescription}
            </p>
          ) : null}
          <p className="mt-4 text-sm font-medium text-zinc-700">
            {reviewDisplay.modeLabel} · no real money moved.
          </p>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">Evidence</h2>
          <ReadableDetails items={reviewDisplay.evidence} />
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">Audit trail</h2>
          <ol className="mt-4 space-y-3">
            {reviewDisplay.auditTrail.map((item) => (
              <li
                className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700"
                key={item.id}
              >
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-zinc-950">{item.label}</p>
                  <p className="text-xs font-medium text-zinc-500">
                    {item.timestamp}
                  </p>
                </div>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {item.actor}
                </p>
                {item.description ? (
                  <p className="mt-2 leading-6">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ol>
        </section>

        <DeveloperDetails
          demoDetails={demoDetails}
          impactSummary={impactSummary}
          request={request}
          safetyLabel={safetyLabel}
          safetyValue={safetyValue}
          stripeTestRefund={stripeTestRefund}
        />
      </div>
    </section>
  );
}

function ReadableDetails({
  items,
}: {
  items: DashboardRefundReviewDisplay["customerContext"];
}) {
  return (
    <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div
          className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
          key={item.label}
        >
          <dt className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            {item.label}
          </dt>
          <dd className="mt-1 text-sm font-semibold text-zinc-950">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
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

function DeveloperDetails({
  demoDetails,
  impactSummary,
  request,
  safetyLabel,
  safetyValue,
  stripeTestRefund,
}: {
  demoDetails: DemoRefundDetails;
  impactSummary: string;
  request: RefundRequestDetail;
  safetyLabel: string;
  safetyValue: string | null;
  stripeTestRefund: StripeTestRefundDetails;
}) {
  return (
    <details className="rounded-lg border border-zinc-200 bg-white p-5">
      <summary className="cursor-pointer text-base font-semibold text-zinc-950">
        Developer details
      </summary>
      <p className="mt-2 text-sm text-zinc-500">
        Raw request, policy, execution, Stripe test-mode and audit data for
        debugging.
      </p>

      <div className="mt-5 space-y-6">
        <section>
          <h3 className="text-sm font-semibold text-zinc-950">
            Request metadata
          </h3>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <Detail label="Request ID" value={request.id} />
            <Detail label="Operation" value={request.operation} />
            <Detail label="Raw status" value={request.status} />
            <Detail
              label="Raw decision"
              value={request.decision}
            />
            <Detail label="Raw policy reason" value={request.decisionReason} />
            <Detail label="Impact summary" value={impactSummary} />
            <Detail label={safetyLabel} value={safetyValue} />
            <Detail label="Order context" value={demoDetails.order} />
            <Detail label="Risk context" value={demoDetails.riskReason} />
            <Detail label="Created" value={formatDateTime(request.createdAt)} />
            <Detail label="Updated" value={formatDateTime(request.updatedAt)} />
          </dl>
        </section>

        {stripeTestRefund?.paymentObject ? (
          <section>
            <h3 className="text-sm font-semibold text-zinc-950">
              Stripe test-mode payment metadata
            </h3>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Detail
                label="PaymentIntent ID"
                value={stripeTestRefund.paymentObject.paymentIntentId}
              />
              <Detail
                label="Charge ID"
                value={stripeTestRefund.paymentObject.chargeId}
              />
              <Detail
                label="Proposed refund"
                value={stripeTestRefund.paymentObject.proposedRefundAmount}
              />
              <Detail label="Amount" value={stripeTestRefund.paymentObject.amount} />
              <Detail
                label="Refunded so far"
                value={stripeTestRefund.paymentObject.refundedSoFar}
              />
              <Detail
                label="Refundable amount"
                value={stripeTestRefund.paymentObject.refundableAmount}
              />
              <Detail
                label="Currency"
                value={stripeTestRefund.paymentObject.currency}
              />
              <Detail
                label="Stripe object status"
                value={stripeTestRefund.paymentObject.status}
              />
              <Detail label="Mode" value={stripeTestRefund.paymentObject.mode} />
              <Detail
                label="Livemode"
                value={stripeTestRefund.paymentObject.livemode}
              />
            </dl>
          </section>
        ) : null}

        {stripeTestRefund?.refund ? (
          <section>
            <h3 className="text-sm font-semibold text-zinc-950">
              Stripe test-mode refund metadata
            </h3>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Detail label="Refund ID" value={stripeTestRefund.refund.refundId} />
              <Detail
                label="Execution status"
                value={stripeTestRefund.refund.executionStatus}
              />
              <Detail
                label="Stripe refund status"
                value={stripeTestRefund.refund.stripeStatus}
              />
              <Detail label="Amount" value={stripeTestRefund.refund.amount} />
              <Detail label="Currency" value={stripeTestRefund.refund.currency} />
              <Detail
                label="Created"
                value={formatDateTime(stripeTestRefund.refund.createdAt)}
              />
              <Detail
                label="Updated"
                value={formatDateTime(stripeTestRefund.refund.updatedAt)}
              />
              <Detail
                label="Idempotency"
                value={stripeTestRefund.refund.idempotency}
              />
            </dl>
          </section>
        ) : null}

        {stripeTestRefund?.webhook ? (
          <section>
            <h3 className="text-sm font-semibold text-zinc-950">
              Webhook reconciliation
            </h3>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <Detail label="Last event type" value={stripeTestRefund.webhook.type} />
              <Detail
                label="Processing status"
                value={stripeTestRefund.webhook.processingStatus}
              />
              <Detail
                label="Stripe status after reconciliation"
                value={stripeTestRefund.webhook.stripeStatusAfterReconciliation}
              />
              <Detail
                label="Timestamp"
                value={formatDateTime(stripeTestRefund.webhook.timestamp)}
              />
              <Detail label="Safe message" value={stripeTestRefund.webhook.message} />
            </dl>
          </section>
        ) : null}

        <DeveloperList
          empty="No approvals recorded."
          items={request.approvals.map((approval) => ({
            id: approval.id,
            title: approval.status,
            body: [
              `Reviewer: ${
                approval.reviewer?.displayName ??
                approval.reviewer?.email ??
                "unknown"
              }`,
              `Reason: ${approval.reason ?? "none"}`,
              `Reviewed: ${
                approval.reviewedAt
                  ? formatDateTime(approval.reviewedAt)
                  : formatDateTime(approval.createdAt)
              }`,
            ],
          }))}
          title="Approval records"
        />

        <DeveloperList
          empty="No executions recorded."
          items={request.executions.map((execution) => ({
            id: execution.id,
            title: `${execution.status} / ${execution.mode}`,
            body: [
              `Started: ${
                execution.startedAt
                  ? formatDateTime(execution.startedAt)
                  : "not recorded"
              }`,
              `Completed: ${
                execution.completedAt
                  ? formatDateTime(execution.completedAt)
                  : "not recorded"
              }`,
            ],
          }))}
          title="Execution metadata"
        />

        <DeveloperList
          empty="No audit events recorded."
          items={request.auditEvents.map((event) => ({
            id: event.id,
            title: `${event.type} / ${event.actorType}`,
            body: [formatDateTime(event.createdAt), formatJson(event.metadata)],
          }))}
          title="Raw audit events"
        />

        <JsonBlock title="Refund resource" value={request.resource} />
        <JsonBlock title="Parameters" value={request.parameters} />
        <JsonBlock title="Context" value={request.context} />
      </div>
    </details>
  );
}

function DeveloperList({
  empty,
  items,
  title,
}: {
  empty: string;
  items: { id: string; title: string; body: string[] }[];
  title: string;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      {items.length === 0 ? (
        <EmptyLine>{empty}</EmptyLine>
      ) : (
        <div className="mt-3 space-y-3">
          {items.map((item) => (
            <div
              className="rounded-md border border-zinc-200 bg-zinc-50 p-3"
              key={item.id}
            >
              <p className="text-sm font-semibold text-zinc-950">
                {item.title}
              </p>
              {item.body.map((line) => (
                <p className="mt-1 text-xs leading-5 text-zinc-600" key={line}>
                  {line}
                </p>
              ))}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function JsonBlock({ title, value }: { title: string; value: unknown }) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-zinc-950">{title}</h3>
      <pre className="mt-3 overflow-auto rounded-md bg-zinc-950 p-4 text-xs leading-5 text-zinc-100">
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
  riskReason: string | null;
} {
  const parameterRecord = isRecord(parameters) ? parameters : {};
  const contextRecord = isRecord(context) ? context : {};
  const amount = parameterRecord["amount"];
  const currency = parameterRecord["currency"];
  const customer = isRecord(contextRecord["customer"])
    ? contextRecord["customer"]
    : {};
  const order = isRecord(contextRecord["order"]) ? contextRecord["order"] : {};
  const risk = isRecord(contextRecord["risk"]) ? contextRecord["risk"] : {};
  const riskLabel = risk["label"];
  const riskScore = risk["score"];

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
        ? "Demo simulation only; Stripe is not called and no money moves."
        : null,
    riskReason:
      typeof riskLabel === "string" && typeof riskScore === "number"
        ? `${riskLabel} risk; score ${riskScore}`
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
