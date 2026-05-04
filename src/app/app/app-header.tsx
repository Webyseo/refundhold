import Link from "next/link";
import { headers } from "next/headers";

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
  const headerList = await headers();
  const currentPath =
    headerList.get("x-refundhold-current-path")?.split("?")[0] ?? "/app";

  return (
    <AppHeaderContent
      context={access.ok ? access.context : null}
      currentPath={currentPath}
    />
  );
}

export function AppHeaderContent({
  context,
  currentPath = "/app/refund-requests",
}: {
  context: AppAccessContext | null;
  currentPath?: string;
}) {
  const isSession = context?.source === "session";
  const displayName = context?.displayName ?? "Demo Reviewer";
  const role = context ? formatRole(context.role) : "Reviewer";
  const organization = context?.organizationName ?? "RefundHold Demo";
  const permissionLabels = context
    ? getPermissionLabels(context.permissions)
    : ["Can review", "Can execute"];

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-5 sm:px-8">
        <div>
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center rounded-md text-lg font-semibold tracking-tight text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          >
            RefundHold
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold">
            <span className="rounded-full border border-emerald-300/40 bg-emerald-300/10 px-2.5 py-1 text-emerald-100">
              Demo simulation
            </span>
            {!isSession ? (
              <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-200">
                Private demo
              </span>
            ) : null}
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-200">
              {role}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-300">
            <span className="font-semibold text-zinc-50">{displayName}</span>
            {isSession && context?.email ? (
              <span className="text-zinc-400"> · {context.email}</span>
            ) : null}
            <span className="text-zinc-400"> · {organization}</span>
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            {permissionLabels.join(" · ")}
          </p>
          <p className="mt-3 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-3 py-2 text-sm font-medium text-emerald-100">
            No live Stripe money moves in this demo.
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          {appNavLinks.map((link) => {
            const active = isActiveAppPath(currentPath, link.href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 items-center rounded-md px-3 py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  active
                    ? "bg-emerald-300 text-zinc-950"
                    : "border border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-50"
                }`}
                href={link.href}
                key={link.href}
              >
                {link.label}
              </Link>
            );
          })}
          {isSession ? (
            <SessionSignOutButton
              redirectTo={context.authRequired ? "/login" : "/demo-access?exited=1"}
            />
          ) : (
            <form action={clearDemoAccessFromDashboard}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded-md border border-zinc-700 px-3 py-2 text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
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

const appNavLinks = [
  { label: "Overview", href: "/app" },
  { label: "Refund requests", href: "/app/refund-requests" },
  { label: "Onboarding", href: "/app/onboarding" },
  { label: "Stripe", href: "/app/stripe" },
  { label: "Feedback", href: "/app/feedback" },
] as const;

function isActiveAppPath(currentPath: string, href: string): boolean {
  if (href === "/app") {
    return currentPath === "/app";
  }

  return currentPath === href || currentPath.startsWith(`${href}/`);
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
