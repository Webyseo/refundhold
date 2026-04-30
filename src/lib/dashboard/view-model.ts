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

export type DashboardRefundReviewAuditEventSource =
  DashboardQueueAuditEventSource & {
    actorType?: "USER" | "AGENT" | "SYSTEM";
    metadata?: unknown;
    agent?: DashboardAgentDisplay | null;
    user?: DashboardReviewerDisplay | null;
  };

export type DashboardAgentDisplay = {
  id: string;
  name: string;
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

export type DashboardRefundReviewDisplayInput = Omit<
  DashboardStripeTestRefundViewModelInput,
  "auditEvents"
> & {
  context?: unknown;
  requestPayload?: unknown;
  decisionReason?: string | null;
  agent?: DashboardAgentDisplay;
  approvals?: Array<{
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELED" | "EXPIRED";
    reason: string | null;
    reviewedAt: Date | null;
    createdAt: Date;
    reviewer: DashboardReviewerDisplay | null;
  }>;
  executions?: Array<{
    id: string;
    mode: "DRY_RUN" | "DIRECT" | "GRANT";
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
  }>;
  auditEvents?: DashboardRefundReviewAuditEventSource[];
};

export type DashboardRefundReviewDisplay = {
  amount: string | null;
  aiJustification: string;
  modeLabel: "Demo simulation" | "Stripe test-mode" | "Live refunds blocked";
  policyDescription: string | null;
  customerContext: Array<{ label: string; value: string }>;
  statusItems: Array<{ label: string; value: string }>;
  evidence: Array<{ label: string; value: string }>;
  auditTrail: Array<{
    id: string;
    timestamp: string;
    actor: string;
    label: string;
    description: string | null;
  }>;
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

export function formatRefundRequestAmount(parameters: unknown): string | null {
  if (!isRecord(parameters)) {
    return null;
  }

  const currency = readOptionalStringFromRecord(parameters, "currency");

  if (!currency) {
    return null;
  }

  const amountMinor = readOptionalNumberFromRecord(parameters, "amount_minor");

  if (amountMinor !== null) {
    return formatMinorUnitAmount(amountMinor, currency);
  }

  const amount = readOptionalNumberFromRecord(parameters, "amount");

  if (amount === null) {
    return null;
  }

  return formatMajorUnitAmount(amount, currency);
}

export function getRefundReviewDisplay(
  request: DashboardRefundReviewDisplayInput,
): DashboardRefundReviewDisplay {
  const stripeTestRefund = getStripeTestRefundViewModel(request);
  const modeLabel = getRefundModeLabel(request, stripeTestRefund);
  const amount =
    stripeTestRefund?.paymentObject?.proposedRefundAmount ??
    stripeTestRefund?.refund?.amount ??
    formatRefundRequestAmount(request.parameters);
  const latestApproval = request.approvals?.[0] ?? null;
  const latestExecution = request.executions?.[0] ?? null;

  return {
    amount,
    aiJustification: getAiJustification(request),
    modeLabel,
    policyDescription: getPolicyReasonDisplay(request.decisionReason),
    customerContext: getCustomerContextItems({
      request,
      amount,
    }),
    statusItems: [
      {
        label: "Current status",
        value: getReviewerCurrentStatusLabel(request.status),
      },
      {
        label: "Policy result",
        value: getReviewerPolicyResultLabel(request.decision),
      },
      {
        label: "Reviewer decision",
        value: getReviewerDecisionLabel({
          approval: latestApproval,
          decision: request.decision,
          status: request.status,
        }),
      },
      {
        label: "Execution outcome",
        value: getExecutionOutcomeLabel({
          execution: latestExecution,
          status: request.status,
        }),
      },
    ],
    evidence: getRefundEvidenceItems({
      request,
      modeLabel,
      stripeTestRefund,
      latestApproval,
      latestExecution,
    }),
    auditTrail: getRefundAuditTrail({
      auditEvents: request.auditEvents ?? [],
      modeLabel,
      status: request.status,
    }),
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

function getRefundModeLabel(
  request: DashboardRefundReviewDisplayInput,
  stripeTestRefund: DashboardStripeTestRefundViewModel | null,
): DashboardRefundReviewDisplay["modeLabel"] {
  if (isLiveRefundRecord(request)) {
    return "Live refunds blocked";
  }

  if (stripeTestRefund || isStripeTestRefundRequest(request)) {
    return "Stripe test-mode";
  }

  return "Demo simulation";
}

function isLiveRefundRecord(request: DashboardRefundReviewDisplayInput): boolean {
  const resource = isRecord(request.resource) ? request.resource : {};
  const parameters = isRecord(request.parameters) ? request.parameters : {};

  return Boolean(
    request.stripePaymentObject?.mode === "LIVE" ||
      request.stripePaymentObject?.livemode ||
      (isDetailedStripeRefund(request.stripeRefund) &&
        request.stripeRefund.mode === "LIVE") ||
      resource["livemode"] === true ||
      parameters["livemode"] === true,
  );
}

function getAiJustification(
  request: DashboardRefundReviewDisplayInput,
): string {
  const context = isRecord(request.context) ? request.context : {};
  const requestPayload = isRecord(request.requestPayload)
    ? request.requestPayload
    : {};
  const payloadContext = isRecord(requestPayload["context"])
    ? requestPayload["context"]
    : {};
  const payloadParameters = isRecord(requestPayload["parameters"])
    ? requestPayload["parameters"]
    : {};
  const aiAgent = isRecord(context["ai_agent"]) ? context["ai_agent"] : {};
  const parameters = isRecord(request.parameters) ? request.parameters : {};
  const technicalReason =
    readOptionalStringFromRecord(parameters, "reason") ??
    readOptionalStringFromRecord(payloadParameters, "reason");
  const orderSummary =
    readOptionalStringFromRecord(context, "order_summary") ??
    readOptionalStringFromRecord(payloadContext, "order_summary") ??
    readNestedString(context, ["order", "summary"]) ??
    readNestedString(payloadContext, ["order", "summary"]);

  return (
    readOptionalStringFromRecord(context, "risk_reason") ??
    readOptionalStringFromRecord(payloadContext, "risk_reason") ??
    orderSummary ??
    humanizeRefundReason(technicalReason) ??
    readOptionalStringFromRecord(aiAgent, "rationale") ??
    readOptionalStringFromRecord(context, "ai_agent_reason") ??
    readOptionalStringFromRecord(payloadContext, "ai_agent_reason") ??
    readOptionalStringFromRecord(context, "customer_message") ??
    readOptionalStringFromRecord(payloadContext, "customer_message") ??
    readAuditMetadataString(request.auditEvents ?? [], "customer_message") ??
    readAuditMetadataString(request.auditEvents ?? [], "reason") ??
    "The AI support agent recommended this refund and RefundHold evaluated it against your refund policy."
  );
}

function getCustomerContextItems({
  amount,
  request,
}: {
  amount: string | null;
  request: DashboardRefundReviewDisplayInput;
}): Array<{ label: string; value: string }> {
  const context = isRecord(request.context) ? request.context : {};
  const parameters = isRecord(request.parameters) ? request.parameters : {};
  const requestPayload = isRecord(request.requestPayload)
    ? request.requestPayload
    : {};
  const payloadContext = isRecord(requestPayload["context"])
    ? requestPayload["context"]
    : {};
  const payloadParameters = isRecord(requestPayload["parameters"])
    ? requestPayload["parameters"]
    : {};
  const technicalReason =
    readOptionalStringFromRecord(parameters, "reason") ??
    readOptionalStringFromRecord(payloadParameters, "reason");
  const customer = getSafeCustomerLabel(context, payloadContext);
  const orderSummary = getOrderSummaryLabel(context, payloadContext);
  const refundReason =
    humanizeRefundReason(technicalReason) ??
    readOptionalStringFromRecord(context, "reason") ??
    readOptionalStringFromRecord(payloadContext, "reason") ??
    "Not recorded in demo data";

  return [
    {
      label: "Customer",
      value: customer ?? "Not recorded in demo data",
    },
    {
      label: "Order summary",
      value: orderSummary ?? "Not recorded in demo data",
    },
    {
      label: "Refund reason",
      value: refundReason,
    },
    {
      label: "Requested by",
      value: request.agent?.name ?? "AI support agent",
    },
    {
      label: "Requested amount",
      value: amount ?? "Not recorded in demo data",
    },
  ];
}

function getSafeCustomerLabel(
  context: Record<string, unknown>,
  payloadContext: Record<string, unknown>,
): string | null {
  const customer = isRecord(context["customer"])
    ? context["customer"]
    : isRecord(payloadContext["customer"])
      ? payloadContext["customer"]
      : {};
  const name = readOptionalStringFromRecord(customer, "name");
  const email = readOptionalStringFromRecord(customer, "email");
  const safeEmail = email && isSafeDemoEmail(email) ? email : null;

  if (name && safeEmail) {
    return `${name} (${safeEmail})`;
  }

  if (name) {
    return name;
  }

  if (safeEmail) {
    return safeEmail;
  }

  return email ? "Customer recorded in request context" : null;
}

function isSafeDemoEmail(value: string): boolean {
  return value.endsWith("@example.test") || value.endsWith("@refundhold.com");
}

function getOrderSummaryLabel(
  context: Record<string, unknown>,
  payloadContext: Record<string, unknown>,
): string | null {
  const order = isRecord(context["order"])
    ? context["order"]
    : isRecord(payloadContext["order"])
      ? payloadContext["order"]
      : {};
  const id = readOptionalStringFromRecord(order, "id");
  const summary =
    readOptionalStringFromRecord(order, "summary") ??
    readOptionalStringFromRecord(context, "order_summary") ??
    readOptionalStringFromRecord(payloadContext, "order_summary");

  if (id && summary) {
    return `${id} - ${summary}`;
  }

  return summary ?? id;
}

function getReviewerCurrentStatusLabel(status: DashboardStatus): string {
  switch (status) {
    case "APPROVAL_REQUIRED":
    case "PROPOSED":
      return "Waiting for review";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "EXECUTED":
      return "Executed";
    case "DENIED":
    case "CANCELED":
      return "Blocked";
    case "FAILED":
    case "EXECUTING":
      return "Needs attention";
    case "ALLOWED":
      return "Allowed by policy";
  }
}

function getReviewerPolicyResultLabel(decision: DashboardDecision): string {
  switch (decision) {
    case "ALLOW":
      return "Allowed by policy";
    case "DENY":
      return "Blocked by policy";
    case "APPROVAL_REQUIRED":
      return "Human approval required";
    case null:
      return "Not recorded in demo data";
  }
}

function getReviewerDecisionLabel({
  approval,
  decision,
  status,
}: {
  approval:
    | NonNullable<DashboardRefundReviewDisplayInput["approvals"]>[number]
    | null;
  decision: DashboardDecision;
  status: DashboardStatus;
}): string {
  if (approval?.status === "APPROVED" || status === "APPROVED") {
    return "Approved";
  }

  if (approval?.status === "REJECTED" || status === "REJECTED") {
    return "Rejected";
  }

  if (decision === "ALLOW") {
    return "Not required by policy";
  }

  if (decision === "DENY" || status === "DENIED" || status === "CANCELED") {
    return "Blocked by policy";
  }

  if (decision === "APPROVAL_REQUIRED") {
    return "Waiting for review";
  }

  return "Not recorded in demo data";
}

function getExecutionOutcomeLabel({
  execution,
  status,
}: {
  execution:
    | NonNullable<DashboardRefundReviewDisplayInput["executions"]>[number]
    | null;
  status: DashboardStatus;
}): string {
  if (execution?.status === "SUCCEEDED" || status === "EXECUTED") {
    return "Executed";
  }

  if (
    execution?.status === "FAILED" ||
    execution?.status === "CANCELED" ||
    status === "FAILED" ||
    status === "EXECUTING"
  ) {
    return "Needs attention";
  }

  if (status === "REJECTED") {
    return "Rejected";
  }

  if (status === "DENIED" || status === "CANCELED") {
    return "Blocked";
  }

  if (status === "APPROVED") {
    return "Approved";
  }

  if (status === "ALLOWED") {
    return "Allowed by policy";
  }

  return "Waiting for review";
}

function getRefundEvidenceItems({
  latestApproval,
  latestExecution,
  modeLabel,
  request,
  stripeTestRefund,
}: {
  request: DashboardRefundReviewDisplayInput;
  modeLabel: DashboardRefundReviewDisplay["modeLabel"];
  stripeTestRefund: DashboardStripeTestRefundViewModel | null;
  latestApproval:
    | NonNullable<DashboardRefundReviewDisplayInput["approvals"]>[number]
    | null;
  latestExecution:
    | NonNullable<DashboardRefundReviewDisplayInput["executions"]>[number]
    | null;
}): Array<{ label: string; value: string }> {
  const idempotency = getIdempotencyEvidence(request, stripeTestRefund);
  const reviewer = latestApproval?.reviewer
    ? getDemoReviewerDisplayName(latestApproval.reviewer)
    : null;
  const webhookStatus =
    stripeTestRefund?.webhook?.processingStatus ??
    getWebhookStatusFromRequest(request) ??
    (modeLabel === "Demo simulation"
      ? "Not required for demo simulation"
      : "Not recorded");
  const evidence = [
    { label: "Request ID", value: request.id },
    {
      label: "Actor",
      value: request.agent?.name ?? "AI support agent",
    },
    getPolicyReasonDisplay(request.decisionReason)
      ? {
          label: "Matched rule",
          value: getPolicyReasonDisplay(request.decisionReason) as string,
        }
      : null,
    { label: "Stripe mode", value: modeLabel },
    {
      label: "Live mode",
      value: modeLabel === "Live refunds blocked" ? "Blocked" : "No",
    },
    { label: "Idempotency", value: idempotency },
    { label: "Webhook status", value: webhookStatus },
    latestExecution ? { label: "Execution ID", value: latestExecution.id } : null,
    reviewer ? { label: "Reviewer", value: reviewer } : null,
  ];

  return evidence.filter((item): item is { label: string; value: string } =>
    Boolean(item),
  );
}

function getWebhookStatusFromRequest(
  request: DashboardRefundReviewDisplayInput,
): string | null {
  const parameters = isRecord(request.parameters) ? request.parameters : {};
  const context = isRecord(request.context) ? request.context : {};

  return (
    readOptionalStringFromRecord(parameters, "webhook_status") ??
    readOptionalStringFromRecord(context, "webhook_status")
  );
}

function getPolicyReasonDisplay(reason: string | null | undefined): string | null {
  if (!reason?.trim()) {
    return null;
  }

  return reason
    .trim()
    .replace(/^approval_required:?/i, "Human approval required:")
    .replace(/^allow:?/i, "Allowed by policy:")
    .replace(/^deny:?/i, "Blocked by policy:")
    .replace(/\bAPPROVAL_REQUIRED\b/g, "human approval required")
    .replace(/\bALLOW\b/g, "allowed by policy")
    .replace(/\bDENY\b/g, "blocked by policy");
}

function getIdempotencyEvidence(
  request: DashboardRefundReviewDisplayInput,
  stripeTestRefund: DashboardStripeTestRefundViewModel | null,
): string {
  if (stripeTestRefund?.refund?.idempotency) {
    return stripeTestRefund.refund.idempotency;
  }

  const parameters = isRecord(request.parameters) ? request.parameters : {};
  const requestPayload = isRecord(request.requestPayload)
    ? request.requestPayload
    : {};
  const payloadParameters = isRecord(requestPayload["parameters"])
    ? requestPayload["parameters"]
    : {};

  return (
    readOptionalStringFromRecord(parameters, "idempotency_key") ??
    readOptionalStringFromRecord(parameters, "idempotency") ??
    readOptionalStringFromRecord(payloadParameters, "idempotency_key") ??
    readOptionalStringFromRecord(payloadParameters, "idempotency") ??
    "Not recorded in demo data"
  );
}

function getRefundAuditTrail({
  auditEvents,
  modeLabel,
  status,
}: {
  auditEvents: DashboardRefundReviewAuditEventSource[];
  modeLabel: DashboardRefundReviewDisplay["modeLabel"];
  status: DashboardStatus;
}): DashboardRefundReviewDisplay["auditTrail"] {
  if (auditEvents.length === 0) {
    return getFallbackAuditTrail(status);
  }

  return auditEvents.map((event) => ({
    id: event.id,
    timestamp: formatDateTime(event.createdAt),
    actor: getAuditActorLabel(event),
    label: getAuditEventLabel(event.type, modeLabel),
    description: getAuditEventDescription(event),
  }));
}

function getFallbackAuditTrail(
  status: DashboardStatus,
): DashboardRefundReviewDisplay["auditTrail"] {
  const rows: DashboardRefundReviewDisplay["auditTrail"] = [
    {
      id: "fallback-request-received",
      timestamp: "Recorded",
      actor: "AI support agent",
      label: "Request received from AI support agent",
      description: null,
    },
    {
      id: "fallback-policy-evaluated",
      timestamp: "Recorded",
      actor: "RefundHold",
      label: "Policy evaluated",
      description: null,
    },
  ];

  if (status === "APPROVAL_REQUIRED") {
    rows.push({
      id: "fallback-approval-requested",
      timestamp: "Pending",
      actor: "RefundHold",
      label: "Human approval requested",
      description: "Reviewer decision needed",
    });
  }

  return rows;
}

function getAuditActorLabel(event: DashboardRefundReviewAuditEventSource): string {
  if (event.user) {
    return getDemoReviewerDisplayName(event.user);
  }

  if (event.agent?.name) {
    return event.agent.name;
  }

  if (event.actorType === "SYSTEM") {
    return "RefundHold";
  }

  if (event.actorType === "USER") {
    return "Reviewer";
  }

  return "AI support agent";
}

function getAuditEventLabel(
  type: string,
  modeLabel: DashboardRefundReviewDisplay["modeLabel"],
): string {
  switch (type) {
    case "ACTION_PROPOSED":
    case "REQUEST_RECEIVED":
      return "Request received from AI support agent";
    case "STRIPE_PAYMENT_OBJECT_REFLECTED":
      return "Stripe test-mode payment reflected";
    case "POLICY_EVALUATED":
      return "Policy evaluated";
    case "DECISION_CREATED":
      return "Policy decision recorded";
    case "APPROVAL_REQUESTED":
      return "Human approval requested";
    case "APPROVAL_APPROVED":
      return "Reviewer approved refund";
    case "APPROVAL_REJECTED":
      return "Reviewer rejected refund";
    case "EXECUTION_STARTED":
    case "STRIPE_REFUND_REQUESTED":
      return modeLabel === "Stripe test-mode"
        ? "Stripe test-mode execution recorded"
        : "Demo execution recorded";
    case "STRIPE_REFUND_SUCCEEDED":
    case "EXECUTION_SUCCEEDED":
      return modeLabel === "Stripe test-mode"
        ? "Stripe test-mode execution recorded"
        : "Demo execution recorded";
    case "STRIPE_WEBHOOK_RECEIVED":
      return "Webhook received";
    case "STRIPE_WEBHOOK_PROCESSED":
    case "STRIPE_REFUND_STATUS_UPDATED":
      return "Webhook reconciliation processed";
    case "STRIPE_WEBHOOK_IGNORED":
      return "Webhook ignored";
    case "STRIPE_REFUND_FAILED":
    case "EXECUTION_FAILED":
      return "Execution failed";
    case "EXECUTION_GRANT_ISSUED":
      return "Execution grant issued";
    default:
      return "Audit event recorded";
  }
}

function getAuditEventDescription(
  event: DashboardRefundReviewAuditEventSource,
): string | null {
  const metadata = isRecord(event.metadata) ? event.metadata : {};

  return (
    readOptionalStringFromRecord(metadata, "comment") ??
    readOptionalStringFromRecord(metadata, "reason") ??
    readOptionalStringFromRecord(metadata, "status") ??
    null
  );
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

function formatMajorUnitAmount(amount: number, currency: string): string {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (normalizedCurrency === "USD") {
    return `${new Intl.NumberFormat("en", {
      currency: "USD",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      style: "currency",
    }).format(amount)} USD`;
  }

  return `${new Intl.NumberFormat("en", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount)} ${normalizedCurrency || "UNKNOWN"}`;
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

function readNestedString(
  value: unknown,
  path: [string, string],
): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const first = value[path[0]];

  if (!isRecord(first)) {
    return null;
  }

  return readOptionalStringFromRecord(first, path[1]);
}

function readAuditMetadataString(
  auditEvents: DashboardRefundReviewAuditEventSource[],
  key: string,
): string | null {
  for (const event of auditEvents) {
    const value = readOptionalStringFromRecord(event.metadata, key);

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
      return "The AI support agent detected a possible duplicate charge and requested a refund.";
    case "fraudulent":
      return "The AI support agent flagged the payment as potentially fraudulent and requested a refund review.";
    case null:
      return null;
    default:
      return reason;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
