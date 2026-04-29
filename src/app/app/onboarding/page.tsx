import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAccessNotice } from "../access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";

export const dynamic = "force-dynamic";

const modes = [
  {
    title: "Demo simulation",
    description: "No Stripe connection. No money moves.",
  },
  {
    title: "Stripe test-mode",
    description: "Uses Stripe test objects only. No live money.",
  },
];

const rules = [
  "Under $50 → allowed",
  "$50–$500 → needs review",
  "Over $500 → blocked",
];

const refundRequestCurl = `curl -X POST http://localhost:3000/api/v1/refund-requests \\
  -H "Authorization: Bearer <agent_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "stripe_mode": "demo_simulation",
    "amount": 42000,
    "currency": "usd",
    "reason": "AI support agent recommends refund"
  }'`;

export default async function OnboardingPage() {
  const access = await getAppAccessContext({
    nextPath: "/app/onboarding",
  });

  if (!access.ok) {
    if (access.reason === "auth_required") {
      redirect(access.redirectTo);
    }

    return <AppAccessNotice message={access.message} />;
  }

  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
          RefundHold onboarding
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-950">
          Start safely
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-600">
          Create your first held refund request without moving live Stripe
          money.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <OnboardingSection step="1" title="Choose mode">
            <div className="grid gap-3 sm:grid-cols-2">
              {modes.map((mode) => (
                <div
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
                  key={mode.title}
                >
                  <p className="text-sm font-semibold text-zinc-950">
                    {mode.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {mode.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
              Live refunds are blocked in v1.
            </p>
          </OnboardingSection>

          <OnboardingSection step="2" title="Confirm refund rules">
            <div className="grid gap-3 sm:grid-cols-3">
              {rules.map((rule) => (
                <p
                  className="rounded-md border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-950"
                  key={rule}
                >
                  {rule}
                </p>
              ))}
            </div>
            <p className="mt-4 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              Use these rules
            </p>
          </OnboardingSection>

          <OnboardingSection step="3" title="Send first refund request">
            <CommandBlock value={refundRequestCurl} />
            <p className="mt-4 text-sm leading-6 text-zinc-600">
              This creates a $420 demo refund proposal. RefundHold should hold
              it for human review.
            </p>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Use the demo agent API key configured for your controlled demo
              environment. Do not use Stripe secrets here.
            </p>
          </OnboardingSection>

          <OnboardingSection step="4" title="Review held refund">
            <p className="text-sm leading-6 text-zinc-600">
              Refunds that need human approval appear in the reviewer dashboard
              before they can continue.
            </p>
            <Link
              className="mt-5 inline-flex rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
              href="/app/refund-requests"
            >
              Open refund requests
            </Link>
          </OnboardingSection>

          <OnboardingSection step="5" title="View audit trail">
            <p className="text-sm leading-6 text-zinc-600">
              After approval or rejection, RefundHold records the AI proposal,
              policy result, reviewer decision, and execution outcome.
            </p>
            <Link
              className="mt-5 inline-flex rounded-md border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 hover:text-zinc-950"
              href="/demo"
            >
              Try public demo
            </Link>
          </OnboardingSection>
        </div>

        <aside className="h-fit rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-950">Safe start</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-600">
            <p>Use demo simulation first.</p>
            <p>Keep Stripe test-mode separate from demo simulation.</p>
            <p>Review the held refund before any execution step.</p>
          </div>
          <Link
            className="mt-5 inline-flex rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            href="/app/refund-requests"
          >
            Open refund requests
          </Link>
        </aside>
      </div>
    </section>
  );
}

function OnboardingSection({
  children,
  step,
  title,
}: {
  children: React.ReactNode;
  step: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-900">
          {step}
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-950">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CommandBlock({ value }: { value: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">
      <code>{value}</code>
    </pre>
  );
}
