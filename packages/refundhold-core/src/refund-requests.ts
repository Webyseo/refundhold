export type RefundDecision = "allowed" | "needs_review" | "blocked";

export type RefundStatus =
  | RefundDecision
  | "approved"
  | "rejected"
  | "executed"
  | "failed";

export type RefundMode = "demo_simulation" | "stripe_test_mode";

export type RefundRequestCreateInput = {
  stripe_mode?: Extract<RefundMode, "demo_simulation">;
  amount: number;
  currency: string;
  reason: string;
};

export type RefundRequestCreateResponse = {
  refund_request_id: string;
  decision: RefundDecision;
  reason: string;
  review_url: string;
};

export type RefundRequestReviewResponse = {
  refund_request_id: string;
  status: Extract<RefundStatus, "approved" | "rejected">;
  decision?: Extract<RefundStatus, "approved" | "rejected">;
  outcome: Extract<RefundStatus, "approved" | "rejected">;
  review_url: string;
  message: string;
};

export type RefundRequestExecutionResponse = {
  refund_request_id: string;
  status: Extract<RefundStatus, "executed" | "failed">;
  outcome: Extract<RefundStatus, "executed" | "failed">;
  review_url?: string;
  message: string;
};

export type RefundRequestErrorResponse = {
  error: string;
  message: string;
  refund_request_id?: string;
  status?: RefundStatus;
  decision?: RefundStatus;
};

export type RefundRequestPublicResponse =
  | RefundRequestCreateResponse
  | RefundRequestReviewResponse
  | RefundRequestExecutionResponse
  | RefundRequestErrorResponse;
