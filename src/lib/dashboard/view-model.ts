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
  createdAt: Date;
};

export type DashboardReviewerDisplay = {
  displayName: string | null;
  email: string | null;
};

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

export function getImpactSummary({
  operation,
  parameters,
}: {
  operation: string;
  parameters: unknown;
}): string {
  const amountCurrency = getAmountCurrency(parameters);

  if (amountCurrency.amount) {
    return `${amountCurrency.amount} ${amountCurrency.currency ?? ""} ${operation}`.trim();
  }

  return operation;
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
    return "Review evidence, then approve or reject before any dry_run execution.";
  }

  if (state.decision === "APPROVAL_REQUIRED" && state.status === "APPROVED") {
    return "Run the dry_run execution simulation; no Stripe API call is made.";
  }

  if (state.decision === "DENY" || state.status === "DENIED") {
    return "No execution is available because policy blocked the refund.";
  }

  if (state.status === "REJECTED") {
    return "No execution is available because the demo reviewer rejected it.";
  }

  if (state.status === "EXECUTED") {
    return "Use the audit evidence and dry_run execution record in the walkthrough.";
  }

  if (state.decision === "ALLOW" || state.status === "ALLOWED") {
    return "Policy allowed this low-risk dry_run request; no human approval is required.";
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

export function getStatusLabel(status: DashboardStatus): string {
  return status.toLowerCase().replaceAll("_", " ");
}

export function getDecisionLabel(decision: DashboardDecision): string {
  return decision ? decision.toLowerCase().replaceAll("_", " ") : "none";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
