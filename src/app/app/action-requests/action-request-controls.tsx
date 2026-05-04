import {
  approveActionRequestFromDashboard,
  executeActionRequestFromDashboard,
  rejectActionRequestFromDashboard,
} from "../actions";
import type { CurrentUserPermissions } from "../../../lib/auth/current-user";
import type {
  DashboardActionRequestControls,
  DashboardStatus,
  DashboardStripeTestRefundViewModel,
} from "../../../lib/dashboard/view-model";

export function ActionRequestControlsPanel({
  actionRequestId,
  controls,
  permissions,
  returnPath,
  status,
  stripeTestRefund,
}: {
  actionRequestId: string;
  controls: DashboardActionRequestControls;
  permissions: CurrentUserPermissions;
  returnPath?: string;
  status: DashboardStatus;
  stripeTestRefund: Pick<DashboardStripeTestRefundViewModel, "actionStatus"> | null;
}) {
  const reviewActionAvailable = controls.canApprove || controls.canReject;
  const canReview = permissions.reviewActionRequests;
  const canExecute = permissions.executeRefunds;
  const blockedByPermission =
    (reviewActionAvailable && !canReview) ||
    (controls.canExecute && !stripeTestRefund && !canExecute);

  const decisionCopy = getDecisionCopy({
    reviewActionAvailable,
    canExecute: controls.canExecute,
    status,
    stripeTestRefund: Boolean(stripeTestRefund),
  });

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="text-base font-semibold text-zinc-50">
        {decisionCopy.heading}
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-6 text-zinc-300">
        {decisionCopy.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      {blockedByPermission ? (
        <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm font-semibold text-zinc-50">
            You have read-only access.
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-300">
            Reviewer permission required.
          </p>
        </div>
      ) : null}

      {reviewActionAvailable && canReview ? (
        <div className="mt-4 space-y-4">
          <form
            action={approveActionRequestFromDashboard}
            className="rounded-lg border border-emerald-300/40 bg-emerald-300/10 p-4"
          >
            <input type="hidden" name="actionRequestId" value={actionRequestId} />
            {returnPath ? (
              <input type="hidden" name="returnPath" value={returnPath} />
            ) : null}
            <label
              htmlFor="approval-comment"
              className="text-sm font-semibold text-emerald-100"
            >
              Approval note
            </label>
            <p className="mt-1 text-sm leading-6 text-emerald-50/90">
              Approval records the human decision. No live Stripe money moves
              from this screen.
            </p>
            <textarea
              id="approval-comment"
              name="comment"
              className="mt-3 min-h-24 w-full rounded-md border border-emerald-300/50 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/40"
              placeholder="Optional approval comment"
            />
            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Approve refund
            </button>
          </form>
          <form
            action={rejectActionRequestFromDashboard}
            className="rounded-lg border border-red-300/40 bg-red-300/10 p-4"
          >
            <input type="hidden" name="actionRequestId" value={actionRequestId} />
            {returnPath ? (
              <input type="hidden" name="returnPath" value={returnPath} />
            ) : null}
            <label
              htmlFor="rejection-comment"
              className="text-sm font-semibold text-red-100"
            >
              Rejection note
            </label>
            <p className="mt-1 text-sm leading-6 text-red-50/90">
              Rejection blocks the AI-proposed Stripe refund from continuing.
            </p>
            <textarea
              id="rejection-comment"
              name="comment"
              className="mt-3 min-h-24 w-full rounded-md border border-red-300/50 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-red-300 focus:ring-2 focus:ring-red-300/40"
              placeholder="Optional rejection comment"
            />
            <button
              type="submit"
              className="mt-2 w-full rounded-md border border-red-300/60 bg-zinc-950 px-4 py-3 text-sm font-semibold text-red-100 hover:bg-red-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
            >
              Reject refund
            </button>
          </form>
        </div>
      ) : null}

      {controls.canExecute && canExecute && !stripeTestRefund ? (
        <form
          action={executeActionRequestFromDashboard}
          className="mt-4 rounded-lg border border-emerald-300/40 bg-emerald-300/10 p-4"
        >
          <input type="hidden" name="actionRequestId" value={actionRequestId} />
          {returnPath ? (
            <input type="hidden" name="returnPath" value={returnPath} />
          ) : null}
          <p className="text-sm font-semibold text-emerald-100">
            Approved
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-50/90">
            Demo only: this creates a refund execution record. RefundHold
            does not call Stripe and no money moves.
          </p>
          <button
            type="submit"
            className="mt-3 w-full rounded-md bg-emerald-400 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            Record demo execution
          </button>
        </form>
      ) : null}

      {stripeTestRefund ? (
        <div className="mt-4 rounded-lg border border-sky-300/40 bg-sky-300/10 p-4">
          <p className="text-sm font-semibold text-sky-100">
            Stripe test-mode
          </p>
          <p className="mt-1 text-sm leading-6 text-sky-50/90">
            RefundHold records review decisions for this test-mode refund. No
            real money moved.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-sky-100">
            Audit trail recorded
          </p>
        </div>
      ) : null}

      {!controls.canApprove &&
      !controls.canReject &&
      !controls.canExecute &&
      !stripeTestRefund ? (
        <p className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-300">
          No reviewer decision is available for this request state.
        </p>
      ) : null}
    </section>
  );
}

function getDecisionCopy({
  canExecute,
  reviewActionAvailable,
  status,
  stripeTestRefund,
}: {
  canExecute: boolean;
  reviewActionAvailable: boolean;
  status: DashboardStatus;
  stripeTestRefund: boolean;
}): { heading: string; lines: string[] } {
  if (reviewActionAvailable) {
    return {
      heading: "Decision needed",
      lines: [
        "Approve this refund only if the customer should receive the money back.",
        "Reject it if the AI recommendation is wrong, incomplete, or risky.",
      ],
    };
  }

  if (canExecute) {
    return {
      heading: "Decision result",
      lines: [
        "Approved",
        "The reviewer approved this refund for demo simulation. No Stripe API call is made.",
      ],
    };
  }

  if (status === "REJECTED" || status === "DENIED") {
    return {
      heading: "Decision result",
      lines: [
        "Rejected",
        "The reviewer rejected this refund. Stripe execution was blocked.",
      ],
    };
  }

  if (status === "EXECUTED" || stripeTestRefund) {
    return {
      heading: "Decision result",
      lines: [
        "Executed",
        "Demo execution was recorded. No real Stripe money moved.",
      ],
    };
  }

  return {
    heading: "Decision result",
    lines: ["No further reviewer action is available for this request."],
  };
}
