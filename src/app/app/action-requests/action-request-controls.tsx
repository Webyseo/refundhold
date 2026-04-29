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
  stripeTestRefund,
}: {
  actionRequestId: string;
  controls: DashboardActionRequestControls;
  permissions: CurrentUserPermissions;
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
        Available refund action
      </h2>
      <p className="mt-2 text-sm leading-6 text-zinc-600">
        {stripeTestRefund
          ? "Human approval is still the control boundary. Stripe test execution remains server-side flag gated, test mode only, and unavailable from this dashboard."
          : "These controls use demo-only review logic. Any execution remains dry_run and does not call the Stripe API."}
      </p>

      {blockedByPermission ? (
        <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
          <p className="text-sm font-semibold text-zinc-950">
            You have read-only access.
          </p>
          <p className="mt-1 text-sm leading-6 text-zinc-600">
            Reviewer permission required. Server-side RBAC also blocks this
            action.
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
            <label
              htmlFor="approval-comment"
              className="text-sm font-semibold text-emerald-950"
            >
              {stripeTestRefund
                ? "Approve this Stripe test refund review"
                : "Approve this dry_run refund review"}
            </label>
            <p className="mt-1 text-sm leading-6 text-emerald-900">
              {stripeTestRefund
                ? "This records approval only. It does not automatically create a Stripe refund, and live refunds remain disabled."
                : "Demo only: this records approval and unlocks dry_run simulation. It does not create a real Stripe refund."}
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
              {stripeTestRefund
                ? "Approve test refund review"
                : "Approve demo refund review"}
            </button>
          </form>
          <form
            action={rejectActionRequestFromDashboard}
            className="rounded-lg border border-red-200 bg-red-50 p-4"
          >
            <input type="hidden" name="actionRequestId" value={actionRequestId} />
            <label
              htmlFor="rejection-comment"
              className="text-sm font-semibold text-red-950"
            >
              {stripeTestRefund
                ? "Reject and block this Stripe test refund"
                : "Reject and block this dry_run refund"}
            </label>
            <p className="mt-1 text-sm leading-6 text-red-900">
              {stripeTestRefund
                ? "This records rejection and keeps the test refund blocked. No Stripe refund is created."
                : "Demo only: this records rejection and keeps the simulated refund blocked. No Stripe API call is made."}
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
              {stripeTestRefund ? "Reject test refund" : "Reject demo refund"}
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
          <p className="text-sm font-semibold text-emerald-950">
            Approved and ready for simulation
          </p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">
            Demo only: this creates a dry_run refund execution record. RefundHold
            does not call Stripe and no money moves.
          </p>
          <button
            type="submit"
            className="mt-3 w-full rounded-md bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Execute dry_run refund simulation
          </button>
        </form>
      ) : null}

      {stripeTestRefund ? (
        <div className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-4">
          <p className="text-sm font-semibold text-sky-950">
            {stripeTestRefund.actionStatus.label}
          </p>
          <p className="mt-1 text-sm leading-6 text-sky-900">
            {stripeTestRefund.actionStatus.description}
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-sky-800">
            Test mode only; no real money movement; audit evidence recorded
          </p>
        </div>
      ) : null}

      {!controls.canApprove &&
      !controls.canReject &&
      !controls.canExecute &&
      !stripeTestRefund ? (
        <p className="mt-4 rounded-md bg-zinc-50 p-3 text-sm text-zinc-600">
          No refund action is available for this request state.
        </p>
      ) : null}
    </section>
  );
}
