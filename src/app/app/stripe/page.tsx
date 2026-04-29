import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAccessNotice } from "../access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";
import { getStripeSafetyConfig } from "@/lib/stripe/config";

export const dynamic = "force-dynamic";

const checklist = [
  "Create or use a Stripe test account.",
  "Use restricted test keys only.",
  "Configure the existing Stripe test-mode settings.",
  "Confirm webhook test settings if webhooks are enabled.",
  "Send a demo or test refund request.",
  "Review the held refund in RefundHold.",
  "Approve or reject before execution.",
];

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

  const stripeTestStatus = getStripeTestStatus();

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
      tone: "zinc",
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
          RefundHold Stripe status
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          Stripe test-mode
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
          Check whether RefundHold is ready to test refund flows with Stripe
          test objects. Live refunds are blocked in v1.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-3">
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
        <div className="space-y-5">
          <StatusSection title="What Stripe test-mode means">
            <div className="space-y-3 text-sm leading-6 text-zinc-600">
              <p>
                Stripe test-mode lets you verify RefundHold with Stripe test
                objects before any production use.
              </p>
              <p>It must not be confused with live refunds.</p>
              <p>
                Use test keys, test charges, and test webhook settings only.
              </p>
            </div>
          </StatusSection>

          <StatusSection title="Setup checklist">
            <ul className="space-y-3">
              {checklist.map((item) => (
                <li className="flex gap-3 text-sm text-zinc-600" key={item}>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </StatusSection>

          <StatusSection title="Safety boundary">
            <p className="text-sm leading-6 text-zinc-600">
              Live Stripe refunds are blocked in this version. RefundHold can
              run demo simulations and Stripe test-mode flows, but it cannot
              move live money unless production live mode is explicitly built,
              reviewed and enabled.
            </p>
          </StatusSection>
        </div>

        <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-950">Next actions</p>
          <div className="mt-5 flex flex-col gap-3">
            <Link
              className="inline-flex rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
              href="/app/onboarding"
            >
              Open onboarding
            </Link>
            <Link
              className="inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
              href="/app/refund-requests"
            >
              Review refund requests
            </Link>
            <Link
              className="inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
              href="/docs/quickstart"
            >
              Read quickstart
            </Link>
          </div>
          <p className="mt-6 border-t border-zinc-200 pt-4 text-xs leading-5 text-zinc-500">
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

function ModeCard({
  description,
  status,
  title,
  tone,
}: {
  description: string;
  status: string;
  title: string;
  tone: string;
}) {
  const statusClass =
    tone === "emerald"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "amber"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-zinc-200 bg-zinc-100 text-zinc-700";

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg font-semibold text-zinc-950">{title}</h2>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass}`}
        >
          Status: {status}
        </span>
      </div>
      <p className="mt-3 text-sm leading-6 text-zinc-600">{description}</p>
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
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
