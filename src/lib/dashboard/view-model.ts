export type DashboardDecision = "ALLOW" | "DENY" | "APPROVAL_REQUIRED" | null;

export type DashboardStatus =
  | "PROPOSED"
  | "ALLOWED"
  | "DENIED"
  | "APPROVAL_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "EXECUTING"
  | "EXECUTED"
  | "FAILED"
  | "CANCELED";

export type DashboardActionRequestState = {
  decision: DashboardDecision;
  status: DashboardStatus;
};

export type DashboardActionRequestControls = {
  canApprove: boolean;
  canReject: boolean;
  canExecute: boolean;
};

export type DashboardRequestFilter =
  | "all"
  | "pending"
  | "approved"
  | "rejected"
  | "executed";

export type DashboardRequestFilterCounts = Record<DashboardRequestFilter, number>;

export type DashboardActionRequestSummary = DashboardActionRequestState & {
  id: string;
  operation: string;
  parameters: unknown;
  resource?: unknown;
  createdAt: Date;
  connector?: DashboardConnectorDisplay | null;
  stripeRefund?: DashboardStripeRefundQueueSource | null;
  auditEvents?: DashboardQueueAuditEventSource[];
};

export type DashboardReviewerDisplay = {
  displayName: string | null;
  email: string | null;
};

export type DashboardConnectorDisplay = {
  id: string;
  name: string;
  type: string;
};

export type DashboardQueueAuditEventSource = {
  id: string;
  type: string;
  createdAt: Date;
};

export type DashboardStripePaymentObjectSource = {
  id: string;
  organizationId: string;
  connectorId: string;
  mode: "TEST" | "LIVE";
  paymentIntentId: string | null;
  chargeId: string | null;
  amountMinor: number;
  amountRefundedMinor: number;
  currency: string;
  status: string;
  livemode: boolean;
  safeSnapshot?: unknown;
};

export type DashboardStripeRefundQueueSource = {
  id: string;
  stripeRefundId: string | null;
  stripeStatus: string | null;
};

export type DashboardStripeRefundSource =
  DashboardStripeRefundQueueSource & {
    mode: "TEST" | "LIVE";
    paymentIntentId: string | null;
    chargeId: string | null;
    amountMinor: number;
    currency: string;
    reason: string | null;
    safeResponse?: unknown;
    createdAt: Date;
    updatedAt: Date;
    execution: {
      id: string;
      status:
        | "PENDING"
        | "GRANT_ISSUED"
        | "RUNNING"
        | "SUCCEEDED"
        | "FAILED"
        | "CANCELED";
      startedAt: Date | null;
      completedAt: Date | null;
      createdAt: Date;
    } | null;
  };

export type DashboardStripeWebhookEventSource = {
  id: string;
  type: string;
  status: "RECEIVED" | "PROCESSED" | "IGNORED" | "FAILED";
  errorMessage: string | null;
  receivedAt: Date;
  processedAt: Date | null;
  safePayload?: unknown;
};

export type DashboardStripeTestRefundViewModelInput =
  DashboardActionRequestState & {
    id: string;
    operation: string;
    createdAt?: Date;
    connector?: DashboardConnectorDisplay | null;
    resource?: unknown;
    parameters?: unknown;
    stripePaymentObject?: DashboardStripePaymentObjectSource | null;
    stripeRefund?: DashboardStripeRefundSource | DashboardStripeRefundQueueSource | null;
    latestStripeWebhookEvent?: DashboardStripeWebhookEventSource | null;
    auditEvents?: DashboardQueueAuditEventSource[];
  };

export type DashboardStripeTestRefundViewModel = {
  safetyBadges: string[];
  paymentObject: {
    paymentIntentId: string | null;
    chargeId: string | null;
    amount: string;
    refundedSoFar: string;
    refundableAmount: string;
    proposedRefundAmount: string | null;
    currency: string;
    status: string;
    mode: "TEST";
    livemode: "false";
  } | null;
  refund: {
    refundId: string | null;
    executionStatus: string;
    stripeStatus: string | null;
    amount: string;
    currency: string;
    createdAt: Date;
    updatedAt: Date;
    idempotency: "Protected by idempotency hash";
  } | null;
  webhook: {
    type: string;
    processingStatus: string;
    stripeStatusAfterReconciliation: string | null;
    timestamp: Date;
    message: string | null;
  } | null;
  actionStatus: {
    label: string;
    description: string;
    canRenderExecuteButton: false;
  };
};

const webhookReconciliationAuditTypes = new Set([
  "STRIPE_WEBHOOK_PROCESSED",
  "STRIPE_REFUND_STATUS_UPDATED",
  "STRIPE_REFUND_FAILED",
]);

export function getAmountCurrency(parameters: unknown): {
  amount: string | null;
  currency: string | null;
} {
  if (!isRecord(parameters)) {
    return {
      amount: null,
      currency: null,
    };
  }

  const amount = parameters["amount"];
  const currency = parameters["currency"];

  return {
    amount: typeof amount === "number" && Number.isFinite(amount)
      ? amount.toString()
      : null,
    currency: typeof currency === "string" && currency.trim().length > 0
      ? currency.toUpperCase()
      : null,
  };
}

export function getStripeTestRefundViewModel(
  request: DashboardStripeTestRefundViewModelInput,
): DashboardStripeTestRefundViewModel | null {
  if (!isStripeTestRefundRequest(request)) {
    return null;
  }

  const paymentObject = request.stripePaymentObject
    ? getStripePaymentObjectDisplay({
        paymentObject: request.stripePaymentObject,
        proposedAmountMinor: readOptionalNumberFromRecord(
          request.parameters,
          "amount_minor",
        ),
      })
    : null;
  const refund = isDetailedStripeRefund(request.stripeRefund)
    ? getStripeRefundDisplay(request.stripeRefund)
    : null;
  const webhook = request.latestStripeWebhookEvent
    ? getStripeWebhookDisplay(request.latestStripeWebhookEvent, refund)
    : null;

  return {
    safetyBadges: [
      "Test mode only",
      "No live money movement",
      "Live refunds disabled",
    ],
    paymentObject,
    refund,
    webhook,
    actionStatus: getStripeActionStatus({
      state: request,
      stripeRefund: request.stripeRefund,
    }),
  };
}

export function getQueueIndicators(
  request: DashboardStripeTestRefundViewModelInput,
): string[] {
  const indicators: string[] = [
    isStripeTestRefundRequest(request) ? "Stripe test-mode" : "Demo simulation",
  ];

  if (
    request.status === "EXECUTED" ||
    readStripeRefundId(request.stripeRefund)
  ) {
    indicators.push("Executed");
  }

  if (hasWebhookReconciliation(request)) {
    indicators.push("Webhook reconciled");
  }

  if (
    request.decision === "APPROVAL_REQUIRED" &&
    request.status === "APPROVAL_REQUIRED"
  ) {
    indicators.push("Needs review");
  }

  return indicators;
}

export function getImpactSummary({
  operation,
  parameters,
}: {
  operation: string;
  parameters: unknown;
}): string {
  const amountCurrency = getAmountCurrency(parameters);

  if (amountCurrency.amount) {
    return `${amountCurrency.amount} ${
      amountCurrency.currency ?? ""
    } Stripe refund`.trim();
  }

  return operation === "refund.create" ? "Stripe refund" : "Refund request";
}

export function getActionRequestControls(
  state: DashboardActionRequestState,
): DashboardActionRequestControls {
  const canReview =
    state.decision === "APPROVAL_REQUIRED" &&
    state.status === "APPROVAL_REQUIRED";

  return {
    canApprove: canReview,
    canReject: canReview,
    canExecute:
      state.decision === "APPROVAL_REQUIRED" && state.status === "APPROVED",
  };
}

export function getDemoReviewerDisplayName(
  reviewer: DashboardReviewerDisplay | null | undefined,
): string {
  const displayName = reviewer?.displayName?.trim();

  if (displayName) {
    return displayName;
  }

  const email = reviewer?.email?.trim();

  if (email?.endsWith("@refundhold.com")) {
    return email;
  }

  return "Demo Reviewer";
}

export function getNextSafeAction(
  state: DashboardActionRequestState,
): string {
  if (
    state.decision === "APPROVAL_REQUIRED" &&
    state.status === "APPROVAL_REQUIRED"
  ) {
    return "Review evidence, then approve or reject before any demo execution.";
  }

  if (state.decision === "APPROVAL_REQUIRED" && state.status === "APPROVED") {
    return "Record the demo execution simulation; no Stripe API call is made.";
  }

  if (state.decision === "DENY" || state.status === "DENIED") {
    return "No execution is available because policy blocked the refund.";
  }

  if (state.status === "REJECTED") {
    return "No execution is available because the demo reviewer rejected it.";
  }

  if (state.status === "EXECUTED") {
    return "Use the audit evidence and demo execution record in the walkthrough.";
  }

  if (state.decision === "ALLOW" || state.status === "ALLOWED") {
    return "Policy allowed this low-risk demo request; no human approval is required.";
  }

  return "Review the policy evidence before taking any demo action.";
}

export function filterActionRequestsByDashboardStatus<
  TRequest extends DashboardActionRequestState,
>(requests: TRequest[], filter: DashboardRequestFilter): TRequest[] {
  if (filter === "all") {
    return requests;
  }

  return requests.filter((request) => getDashboardRequestFilter(request) === filter);
}

export function getRequestFilterCounts<
  TRequest extends DashboardActionRequestState,
>(requests: TRequest[]): DashboardRequestFilterCounts {
  const counts: DashboardRequestFilterCounts = {
    all: requests.length,
    pending: 0,
    approved: 0,
    rejected: 0,
    executed: 0,
  };

  for (const request of requests) {
    const filter = getDashboardRequestFilter(request);

    if (filter !== "all") {
      counts[filter] += 1;
    }
  }

  return counts;
}

export function sortDashboardActionRequestsForReview<
  TRequest extends DashboardActionRequestState & { createdAt: Date },
>(requests: TRequest[]): TRequest[] {
  return [...requests].sort((left, right) => {
    const leftPending = getDashboardRequestFilter(left) === "pending";
    const rightPending = getDashboardRequestFilter(right) === "pending";

    if (leftPending !== rightPending) {
      return leftPending ? -1 : 1;
    }

    return right.createdAt.getTime() - left.createdAt.getTime();
  });
}

export function formatJson(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

export function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

export function formatMinorUnitAmount(
  amountMinor: number,
  currency: string,
): string {
  const normalizedCurrency = currency.trim().toUpperCase();
  const amount = Number.isFinite(amountMinor) ? amountMinor : 0;
  const majorAmount = amount / 100;

  if (normalizedCurrency === "USD") {
    return `${new Intl.NumberFormat("en", {
      style: "currency",
      currency: "USD",
    }).format(majorAmount)} USD`;
  }

  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(majorAmount)} ${normalizedCurrency || "UNKNOWN"}`;
}

export function getStatusLabel(status: DashboardStatus): string {
  switch (status) {
    case "PROPOSED":
      return "Proposed";
    case "ALLOWED":
      return "Allowed by policy";
    case "DENIED":
    case "CANCELED":
      return "Blocked";
    case "APPROVAL_REQUIRED":
      return "Needs review";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "EXECUTING":
      return "Recording";
    case "EXECUTED":
      return "Executed";
    case "FAILED":
      return "Failed";
  }
}

export function getDecisionLabel(decision: DashboardDecision): string {
  switch (decision) {
    case "ALLOW":
      return "Allowed by policy";
    case "DENY":
      return "Blocked";
    case "APPROVAL_REQUIRED":
      return "Needs review";
    case null:
      return "None";
  }
}

function getDashboardRequestFilter(
  request: DashboardActionRequestState,
): DashboardRequestFilter {
  if (
    request.decision === "APPROVAL_REQUIRED" &&
    request.status === "APPROVAL_REQUIRED"
  ) {
    return "pending";
  }

  if (request.status === "APPROVED") {
    return "approved";
  }

  if (request.status === "REJECTED") {
    return "rejected";
  }

  if (request.status === "EXECUTED") {
    return "executed";
  }

  return "all";
}

function isStripeTestRefundRequest(
  request: DashboardStripeTestRefundViewModelInput,
): boolean {
  if (
    request.stripePaymentObject &&
    (request.stripePaymentObject.mode !== "TEST" ||
      request.stripePaymentObject.livemode)
  ) {
    return false;
  }

  if (
    isDetailedStripeRefund(request.stripeRefund) &&
    request.stripeRefund.mode !== "TEST"
  ) {
    return false;
  }

  if (request.stripePaymentObject || request.stripeRefund) {
    return true;
  }

  if (
    request.connector?.type !== "stripe_test" ||
    request.operation !== "refund.create"
  ) {
    return false;
  }

  const resource = isRecord(request.resource) ? request.resource : {};
  const parameters = isRecord(request.parameters) ? request.parameters : {};

  return (
    (resource["type"] === "stripe.payment_intent" ||
      resource["type"] === "stripe.charge") &&
    typeof parameters["amount_minor"] === "number"
  );
}

function getStripePaymentObjectDisplay({
  paymentObject,
  proposedAmountMinor,
}: {
  paymentObject: DashboardStripePaymentObjectSource;
  proposedAmountMinor: number | null;
}): NonNullable<DashboardStripeTestRefundViewModel["paymentObject"]> {
  const currency = paymentObject.currency.toUpperCase();
  const refundableAmountMinor =
    paymentObject.amountMinor - paymentObject.amountRefundedMinor;

  return {
    paymentIntentId: paymentObject.paymentIntentId,
    chargeId: paymentObject.chargeId,
    amount: formatMinorUnitAmount(paymentObject.amountMinor, currency),
    refundedSoFar: formatMinorUnitAmount(
      paymentObject.amountRefundedMinor,
      currency,
    ),
    refundableAmount: formatMinorUnitAmount(
      Math.max(0, refundableAmountMinor),
      currency,
    ),
    proposedRefundAmount:
      proposedAmountMinor === null
        ? null
        : formatMinorUnitAmount(proposedAmountMinor, currency),
    currency,
    status: paymentObject.status,
    mode: "TEST",
    livemode: "false",
  };
}

function getStripeRefundDisplay(
  stripeRefund: DashboardStripeRefundSource,
): NonNullable<DashboardStripeTestRefundViewModel["refund"]> {
  const currency = stripeRefund.currency.toUpperCase();

  return {
    refundId: stripeRefund.stripeRefundId,
    executionStatus: stripeRefund.execution?.status ?? "not recorded",
    stripeStatus: stripeRefund.stripeStatus,
    amount: formatMinorUnitAmount(stripeRefund.amountMinor, currency),
    currency,
    createdAt: stripeRefund.createdAt,
    updatedAt: stripeRefund.updatedAt,
    idempotency: "Protected by idempotency hash",
  };
}

function getStripeWebhookDisplay(
  webhookEvent: DashboardStripeWebhookEventSource,
  refund: DashboardStripeTestRefundViewModel["refund"],
): NonNullable<DashboardStripeTestRefundViewModel["webhook"]> {
  return {
    type: webhookEvent.type,
    processingStatus: webhookEvent.status,
    stripeStatusAfterReconciliation:
      readOptionalStringFromRecord(webhookEvent.safePayload, "status") ??
      refund?.stripeStatus ??
      null,
    timestamp: webhookEvent.processedAt ?? webhookEvent.receivedAt,
    message: webhookEvent.errorMessage,
  };
}

function getStripeActionStatus({
  state,
  stripeRefund,
}: {
  state: DashboardActionRequestState;
  stripeRefund:
    | DashboardStripeRefundSource
    | DashboardStripeRefundQueueSource
    | null
    | undefined;
}): DashboardStripeTestRefundViewModel["actionStatus"] {
  if (readStripeRefundId(stripeRefund) || state.status === "EXECUTED") {
    return {
      label: "Already executed",
      description:
        "The Stripe test refund execution has already been recorded.",
      canRenderExecuteButton: false,
    };
  }

  if (stripeRefund) {
    return {
      label: "Execution already attempted",
      description:
        "A Stripe test refund execution record exists, so duplicate execution is blocked.",
      canRenderExecuteButton: false,
    };
  }

  if (
    state.decision === "APPROVAL_REQUIRED" &&
    state.status === "APPROVAL_REQUIRED"
  ) {
    return {
      label: "Approval required",
      description:
        "Human approval is required before any Stripe test refund execution.",
      canRenderExecuteButton: false,
    };
  }

  if (state.decision === "DENY" || state.status === "DENIED") {
    return {
      label: "Blocked by policy",
      description: "Policy denied this refund request.",
      canRenderExecuteButton: false,
    };
  }

  if (state.status === "REJECTED") {
    return {
      label: "Rejected",
      description: "The reviewer rejected this refund request.",
      canRenderExecuteButton: false,
    };
  }

  if (
    state.decision === "APPROVAL_REQUIRED" &&
    state.status === "APPROVED"
  ) {
    return {
      label: "Test refunds controlled server-side",
      description:
        "This dashboard does not expose Stripe execution controls; approved test refunds remain gated by server-side flags.",
      canRenderExecuteButton: false,
    };
  }

  return {
    label: "Test mode only",
    description:
      "No live Stripe refunds or real money movement are available in this UI.",
    canRenderExecuteButton: false,
  };
}

function readStripeRefundId(
  stripeRefund:
    | DashboardStripeRefundSource
    | DashboardStripeRefundQueueSource
    | null
    | undefined,
): string | null {
  return stripeRefund?.stripeRefundId?.trim() || null;
}

function hasWebhookReconciliation(
  request: DashboardStripeTestRefundViewModelInput,
): boolean {
  if (request.latestStripeWebhookEvent?.status === "PROCESSED") {
    return true;
  }

  return Boolean(
    request.auditEvents?.some((event) => {
      return webhookReconciliationAuditTypes.has(event.type);
    }),
  );
}

function isDetailedStripeRefund(
  value:
    | DashboardStripeRefundSource
    | DashboardStripeRefundQueueSource
    | null
    | undefined,
): value is DashboardStripeRefundSource {
  return Boolean(
    value &&
      "amountMinor" in value &&
      "currency" in value &&
      "createdAt" in value &&
      "updatedAt" in value,
  );
}

function readOptionalNumberFromRecord(
  value: unknown,
  key: string,
): number | null {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];

  return typeof field === "number" && Number.isFinite(field) ? field : null;
}

function readOptionalStringFromRecord(
  value: unknown,
  key: string,
): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const field = value[key];

  return typeof field === "string" && field.trim().length > 0
    ? field.trim()
    : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
