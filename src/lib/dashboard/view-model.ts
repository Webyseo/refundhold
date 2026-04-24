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
