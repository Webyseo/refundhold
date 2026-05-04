import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAccessNotice } from "../access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";
import { getStripeSafetyConfig } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

export default async function StripeStatusPage() {
  const access = await getAppAccessContext({
    nextPath: "/app/stripe",
  });

  if (!access.ok) {
    if (access.reason === "auth_required") {
      redirect(access.redirectTo);
    }

    return <AppAccessNotice message={access.message} />;
  }

  return <StripeStatusContent stripeTestStatus={getStripeTestStatus()} />;
}

export function StripeStatusContent({
  stripeTestStatus = "Setup required",
}: {
  stripeTestStatus?: "Ready" | "Setup required";
}) {
  const modes = [
    {
      title: "Demo simulation",
      description: "No Stripe call. No money moves.",
      status: "Available",
      tone: "emerald",
    },
    {
      title: "Stripe test-mode",
      description: "Uses Stripe test objects only. No live money.",
      status: stripeTestStatus,
      tone: stripeTestStatus === "Ready" ? "emerald" : "amber",
    },
    {
      title: "Live refunds",
      description: "Blocked in v1. Not available yet.",
      status: "Blocked",
      tone: "red",
    },
  ] as const;

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
          RefundHold Stripe status
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50">
          Stripe test-mode
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
          Check whether RefundHold is ready to test refund flows with Stripe
          test objects. Live refunds are blocked in v1.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-emerald-300/30 bg-emerald-300/10 p-5">
        <p className="text-sm font-semibold text-emerald-100">
          You are using demo simulation.
        </p>
        <p className="mt-2 text-sm leading-6 text-emerald-50/90">
          RefundHold does not call Stripe or move money in this private demo.
        </p>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        {modes.map((mode) => (
          <ModeCard
            description={mode.description}
            key={mode.title}
            status={mode.status}
            title={mode.title}
            tone={mode.tone}
          />
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <StatusSection title="Safety boundary">
          <p className="text-sm leading-6 text-zinc-300">
            Live Stripe refunds are blocked in this version. RefundHold can run
            demo simulations and Stripe test-mode flows, but it cannot move
            live money unless production live mode is explicitly built,
            reviewed, and enabled.
          </p>
        </StatusSection>

        <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-50">Next actions</p>
          <div className="mt-5 flex flex-col gap-3">
            <AppActionLink href="/app/onboarding">Open onboarding</AppActionLink>
            <AppActionLink href="/app/refund-requests">
              Review refund requests
            </AppActionLink>
            <AppActionLink href="/docs/stripe-test-mode">
              Read test-mode setup
            </AppActionLink>
            <AppActionLink href="/docs/quickstart">
              Read quickstart
            </AppActionLink>
          </div>
          <p className="mt-6 border-t border-zinc-800 pt-4 text-xs leading-5 text-zinc-400">
            RefundHold is not affiliated with, endorsed by, or sponsored by
            Stripe. Stripe is a trademark of Stripe, Inc.
          </p>
        </aside>
      </div>
    </section>
  );
}

function getStripeTestStatus(): "Ready" | "Setup required" {
  try {
    const config = getStripeSafetyConfig();

    return config.testModeEnabled && config.testRefundsEnabled
      ? "Ready"
      : "Setup required";
  } catch {
    return "Setup required";
  }
}

function AppActionLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
      href={href}
    >
      {children}
    </Link>
  );
}

function ModeCard({
  description,
  status,
  title,
  tone,
}: {
  description: string;
  status: string;
  title: string;
  tone: "amber" | "emerald" | "red";
}) {
  const statusClass =
    tone === "emerald"
      ? "border-emerald-300/50 bg-emerald-300/15 text-emerald-100"
      : tone === "amber"
        ? "border-amber-300/50 bg-amber-300/15 text-amber-100"
        : "border-red-300/50 bg-red-300/15 text-red-100";

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-50">{title}</h2>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
        >
          Status: {status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-300">{description}</p>
    </section>
  );
}

function StatusSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
