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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
