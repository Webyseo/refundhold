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
  getStripeTestRefundViewModel,
  type DashboardDecision,
  type DashboardStatus,
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
    routeBase: "/app/refund-requests",
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
  const impactSummary = getImpactSummary({
    operation: request.operation,
    parameters: request.parameters,
  });
  const demoDetails = getDemoRefundDetails({
    parameters: request.parameters,
    context: request.context,
  });
  const reviewerEvidence = getReviewerEvidence({
    auditEvents: request.auditEvents,
    context: request.context,
    parameters: request.parameters,
  });
  const refundAmount =
    stripeTestRefund?.paymentObject?.proposedRefundAmount ??
    stripeTestRefund?.refund?.amount ??
    demoDetails.refundAmount;
  const safetyLabel = stripeTestRefund ? "Stripe safety" : "Demo simulation";
  const safetyValue = stripeTestRefund
    ? "Test mode only; no live Stripe API calls and no real money movement."
    : demoDetails.dryRun;
  const summaryAmount = formatRefundAmountForSentence({
    parameters: request.parameters,
    fallback: refundAmount,
  });
  const summarySentence = summaryAmount
    ? `AI support agent proposed a ${summaryAmount} Stripe refund.`
    : "AI support agent proposed a Stripe refund.";
  const statusLabel = getReviewerStatusLabel({
    decision: request.decision,
    status: request.status,
  });
  const auditTrail = getReadableAuditTrail({
    status: request.status,
    auditEvents: request.auditEvents,
  });
  const nextSafeAction = getReviewerStatusDescription({
    decision: request.decision,
    status: request.status,
  });
  const success = getSearchMessage(notices["success"]);
  const error = getSearchMessage(notices["error"]);

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <Link
        href="/app/refund-requests"
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
              RefundHold held it because your policy requires human approval for
              refunds between $50 and $500.
            </p>
          </div>
          <div className="mt-5 rounded-md border border-amber-200/50 bg-amber-50/50 p-4">
            <h3 className="text-sm font-semibold text-amber-900">
              AI agent rationale
            </h3>
            <p className="mt-2 text-sm leading-6 text-amber-900">
              {reviewerEvidence.rationale}
            </p>
            {reviewerEvidence.riskReason ? (
              <p className="mt-2 text-sm font-medium text-amber-900">
                Risk assessment: {reviewerEvidence.riskReason}
              </p>
            ) : null}
            {reviewerEvidence.technicalReason ? (
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-amber-800">
                Stripe reason: {reviewerEvidence.technicalReason}
              </p>
            ) : null}
          </div>

          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            <Detail label="AI support agent" value={request.agent.name} />
            <Detail label="Refund amount" value={refundAmount} />
            <Detail label="Customer context" value={demoDetails.customer} />
          </dl>
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
          <p className="mt-3 text-lg font-semibold text-zinc-950">
            $50–$500 → human approval required
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-600">
            RefundHold requires a reviewer decision before this refund can
            continue.
          </p>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">
            Current status
          </h2>
          <p className="mt-3 w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-900">
            {statusLabel}
          </p>
          <p className="mt-3 text-sm leading-6 text-zinc-600">
            {nextSafeAction}
          </p>
          <p className="mt-2 text-sm font-medium text-zinc-700">
            {stripeTestRefund ? "Stripe test-mode" : "Demo simulation"} · No
            real money moved.
          </p>
        </section>

        <section className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="text-base font-semibold text-zinc-950">Audit trail</h2>
          <ol className="mt-4 space-y-3">
            {auditTrail.map((item, index) => (
              <li
                className="flex gap-3 text-sm text-zinc-700"
                key={`${item}-${index}`}
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-900">
                  {index + 1}
                </span>
                <span className="pt-0.5">{item}</span>
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

function formatRefundAmountForSentence({
  fallback,
  parameters,
}: {
  fallback: string | null;
  parameters: unknown;
}): string | null {
  const parameterRecord = isRecord(parameters) ? parameters : {};
  const amount = parameterRecord["amount"];
  const currency = parameterRecord["currency"];

  if (typeof amount === "number" && typeof currency === "string") {
    const normalizedCurrency = currency.trim().toUpperCase();

    if (normalizedCurrency === "USD") {
      return `$${new Intl.NumberFormat("en").format(amount)}`;
    }

    return `${new Intl.NumberFormat("en").format(amount)} ${normalizedCurrency}`;
  }

  return fallback;
}

function getReviewerStatusLabel({
  decision,
  status,
}: {
  decision: DashboardDecision;
  status: DashboardStatus;
}): string {
  if (decision === "DENY" || status === "DENIED" || status === "CANCELED") {
    return "Blocked";
  }

  if (decision === "APPROVAL_REQUIRED" && status === "APPROVAL_REQUIRED") {
    return "Waiting for human approval";
  }

  if (status === "APPROVED") {
    return "Approved";
  }

  if (status === "REJECTED") {
    return "Rejected";
  }

  if (status === "EXECUTED") {
    return "Executed";
  }

  if (status === "FAILED") {
    return "Failed";
  }

  return "Waiting for human approval";
}

function getReviewerStatusDescription({
  decision,
  status,
}: {
  decision: DashboardDecision;
  status: DashboardStatus;
}): string {
  if (decision === "DENY" || status === "DENIED" || status === "CANCELED") {
    return "RefundHold blocked this refund before it could continue.";
  }

  if (decision === "APPROVAL_REQUIRED" && status === "APPROVAL_REQUIRED") {
    return "A human reviewer must approve or reject this refund before it can continue.";
  }

  if (status === "APPROVED") {
    return "The human reviewer approved this refund. Demo execution can be recorded separately.";
  }

  if (status === "REJECTED") {
    return "The human reviewer rejected this refund, so it cannot continue.";
  }

  if (status === "EXECUTED") {
    return "The approved demo execution was recorded for the audit trail.";
  }

  if (status === "FAILED") {
    return "RefundHold recorded a failed execution state for review.";
  }

  return "RefundHold is waiting for the next safe reviewer action.";
}

function getReadableAuditTrail({
  auditEvents,
  status,
}: {
  auditEvents: RefundRequestDetail["auditEvents"];
  status: DashboardStatus;
}): string[] {
  const trail = [
    "Request received from AI agent",
    "Policy evaluated",
    "Human approval requested",
  ];

  if (status === "APPROVED" || status === "EXECUTED" || status === "FAILED") {
    trail.push("Human reviewer approved the refund");
  }

  if (status === "REJECTED") {
    trail.push("Human reviewer rejected the refund");
  }

  if (status === "EXECUTED") {
    trail.push("Demo execution recorded");
  }

  if (status === "FAILED") {
    trail.push("Execution failed");
  }

  if (auditEvents.length > trail.length) {
    trail.push("Additional audit events recorded in Developer details");
  }

  return trail;
}

function getReviewerEvidence({
  auditEvents,
  context,
  parameters,
}: {
  auditEvents: RefundRequestDetail["auditEvents"];
  context: unknown;
  parameters: unknown;
}): {
  rationale: string;
  riskReason: string | null;
  technicalReason: string | null;
} {
  const contextRecord = isRecord(context) ? context : {};
  const aiAgent = isRecord(contextRecord["ai_agent"])
    ? contextRecord["ai_agent"]
    : {};
  const risk = isRecord(contextRecord["risk"]) ? contextRecord["risk"] : {};
  const parameterRecord = isRecord(parameters) ? parameters : {};
  const technicalReason =
    readString(parameterRecord["reason"]) ??
    readString(contextRecord["reason"]);

  const rationale =
    readString(aiAgent["rationale"]) ??
    readString(contextRecord["ai_agent_reason"]) ??
    readString(contextRecord["customer_message"]) ??
    readAuditMetadataString(auditEvents, "customer_message") ??
    humanizeRefundReason(technicalReason) ??
    "No customer-facing rationale was provided by the agent.";

  const riskLabel = readString(risk["label"]);
  const riskScore = typeof risk["score"] === "number" ? risk["score"] : null;
  const riskReason =
    readString(contextRecord["risk_reason"]) ??
    (riskLabel && riskScore !== null
      ? `${riskLabel} risk; score ${riskScore}`
      : null);

  return {
    rationale,
    riskReason,
    technicalReason:
      technicalReason && technicalReason !== rationale
        ? humanizeRefundReason(technicalReason) ?? technicalReason
        : null,
  };
}

function readAuditMetadataString(
  auditEvents: RefundRequestDetail["auditEvents"],
  key: string,
): string | null {
  for (const event of auditEvents) {
    const metadata = isRecord(event.metadata) ? event.metadata : {};
    const value = readString(metadata[key]);

    if (value) {
      return value;
    }
  }

  return null;
}

function humanizeRefundReason(reason: string | null): string | null {
  switch (reason) {
    case "requested_by_customer":
      return "Customer requested a refund; reviewer should confirm the support evidence before approving.";
    case "duplicate":
      return "The AI agent detected a possible duplicate charge and requested a refund.";
    case "fraudulent":
      return "The AI agent flagged the payment as potentially fraudulent and requested a refund review.";
    default:
      return reason;
  }
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
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
