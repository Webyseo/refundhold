import {
  approveActionRequestFromDashboard,
  executeActionRequestFromDashboard,
  rejectActionRequestFromDashboard,
} from "../actions";
import type { CurrentUserPermissions } from "../../../lib/auth/current-user";
import type {
  DashboardActionRequestControls,
  DashboardStripeTestRefundViewModel,
} from "../../../lib/dashboard/view-model";

export function ActionRequestControlsPanel({
  actionRequestId,
  controls,
  permissions,
  returnPath,
  stripeTestRefund,
}: {
  actionRequestId: string;
  controls: DashboardActionRequestControls;
  permissions: CurrentUserPermissions;
  returnPath?: string;
  stripeTestRefund: Pick<DashboardStripeTestRefundViewModel, "actionStatus"> | null;
}) {
  const reviewActionAvailable = controls.canApprove || controls.canReject;
  const canReview = permissions.reviewActionRequests;
  const canExecute = permissions.executeRefunds;
  const blockedByPermission =
    (reviewActionAvailable && !canReview) ||
    (controls.canExecute && !stripeTestRefund && !canExecute);

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5">
      <h2 className="text-base font-semibold text-zinc-950">
        Decision needed
      </h2>
      <div className="mt-2 space-y-2 text-sm leading-6 text-zinc-600">
        <p>
          Approve this refund only if the customer should receive the money
          back.
        </p>
        <p>
          Reject it if the AI recommendation is wrong, incomplete or risky.
        </p>
      </div>

      {blockedByPermission ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-950">
            You have read-only access.
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Reviewer permission required.
          </p>
        </div>
      ) : null}

      {reviewActionAvailable && canReview ? (
        <div className="mt-4 space-y-4">
          <form
            action={approveActionRequestFromDashboard}
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4"
          >
            <input type="hidden" name="actionRequestId" value={actionRequestId} />
            {returnPath ? (
              <input type="hidden" name="returnPath" value={returnPath} />
            ) : null}
            <label
              htmlFor="approval-comment"
              className="text-sm font-semibold text-emerald-950"
            >
              Approval note
            </label>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              Approval records the human decision. No live Stripe money moves
              from this screen.
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
              Approve refund
            </button>
          </form>
          <form
            action={rejectActionRequestFromDashboard}
            className="rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <input type="hidden" name="actionRequestId" value={actionRequestId} />
            {returnPath ? (
              <input type="hidden" name="returnPath" value={returnPath} />
            ) : null}
            <label
              htmlFor="rejection-comment"
              className="text-sm font-semibold text-red-950"
            >
              Rejection note
            </label>
            <p className="mt-1 text-sm leading-6 text-red-900">
              Rejection blocks the AI-proposed Stripe refund from continuing.
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
              Reject refund
            </button>
          </form>
        </div>
      ) : null}

      {controls.canExecute && canExecute && !stripeTestRefund ? (
        <form
          action={executeActionRequestFromDashboard}
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
        >
          <input type="hidden" name="actionRequestId" value={actionRequestId} />
          {returnPath ? (
            <input type="hidden" name="returnPath" value={returnPath} />
          ) : null}
          <p className="text-sm font-semibold text-emerald-950">
            Approved and ready for simulation
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">
            Demo only: this creates a refund execution record. RefundHold
            does not call Stripe and no money moves.
          </p>
          <button
            type="submit"
            className="mt-3 w-full rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Record demo execution
          </button>
        </form>
      ) : null}

      {stripeTestRefund ? (
        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-950">
            Stripe test-mode
          </p>
          <p className="mt-1 text-sm leading-6 text-sky-900">
            RefundHold records review decisions for this test-mode refund. No
            real money moved.
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-sky-800">
            Audit trail recorded
          </p>
        </div>
      ) : null}

      {!controls.canApprove &&
      !controls.canReject &&
      !controls.canExecute &&
      !stripeTestRefund ? (
        <p className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
          No reviewer decision is available for this request state.
        </p>
      ) : null}
    </section>
  );
}
