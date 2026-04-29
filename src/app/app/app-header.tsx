import Link from "next/link";

import { clearDemoAccessFromDashboard } from "./actions";
import {
  getAppAccessContext,
  type AppAccessContext,
} from "../../lib/auth/app-access";
import { SessionSignOutButton } from "./session-sign-out-button";

export async function AppHeader() {
  const access = await getAppAccessContext({
    nextPath: "/app",
  });

  return <AppHeaderContent context={access.ok ? access.context : null} />;
}

export function AppHeaderContent({
  context,
}: {
  context: AppAccessContext | null;
}) {
  const isSession = context?.source === "session";
  const identityLabel = isSession ? "Authenticated session" : "Demo mode";
  const displayName = context?.displayName ?? "Demo Reviewer";
  const role = context ? formatRole(context.role) : "Reviewer";
  const organization = context?.organizationName ?? "RefundHold Demo";
  const permissionLabels = context
    ? getPermissionLabels(context.permissions)
    : ["Can review", "Can execute"];

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 lg:flex-row lg:items-center lg:justify-between sm:px-8">
        <div>
          <Link
            href="/app"
            className="text-lg font-semibold tracking-tight text-zinc-950"
          >
            RefundHold
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span
              className={
                isSession
                  ? "rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-900"
                  : "rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900"
              }
            >
              {identityLabel}
            </span>
            {!isSession ? (
              <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 text-zinc-700">
                Dry-run demo
              </span>
            ) : null}
            <span className="rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-zinc-700">
              {role}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-600">
            <span className="font-semibold text-zinc-900">{displayName}</span>
            {isSession && context?.email ? (
              <span className="text-zinc-500"> · {context.email}</span>
            ) : null}
            <span className="text-zinc-500"> · {organization}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {permissionLabels.join(" · ")}
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-medium">
          <Link
            href="/app"
            className="rounded-md px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
          >
            Overview
          </Link>
          <Link
            href="/app/action-requests"
            className="rounded-md bg-zinc-950 px-3 py-2 text-white hover:bg-zinc-800"
          >
            Refund requests
          </Link>
          {isSession ? (
            <SessionSignOutButton
              redirectTo={context.authRequired ? "/login" : "/demo-access"}
            />
          ) : (
            <form action={clearDemoAccessFromDashboard}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              >
                Exit demo
              </button>
            </form>
          )}
        </nav>
      </div>
    </header>
  );
}

function formatRole(role: AppAccessContext["role"]): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function getPermissionLabels(
  permissions: AppAccessContext["permissions"],
): string[] {
  const labels: string[] = [];

  if (permissions.reviewActionRequests) {
    labels.push("Can review");
  }

  if (permissions.executeRefunds) {
    labels.push("Can execute");
  }

  if (!permissions.reviewActionRequests && !permissions.executeRefunds) {
    labels.push("Read-only");
  }

  return labels;
}
