import Link from "next/link";
import { redirect } from "next/navigation";

import { AppAccessNotice } from "../access-notice";
import { getAppAccessContext } from "@/lib/auth/app-access";

export const dynamic = "force-dynamic";

type OnboardingPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

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
  "Under $50 -> allowed",
  "$50-$500 -> needs review",
  "Over $500 -> blocked",
];

const refundRequestCurl = `curl -X POST https://refundhold.com/api/v1/refund-requests \\
  -H "Authorization: Bearer <agent_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 42000,
    "currency": "usd",
    "reason": "AI support agent recommends refund"
  }'`;

export default async function OnboardingPage({
  searchParams,
}: OnboardingPageProps) {
  const access = await getAppAccessContext({
    nextPath: "/app/onboarding",
  });

  if (!access.ok) {
    if (access.reason === "auth_required") {
      redirect(access.redirectTo);
    }

    return <AppAccessNotice message={access.message} />;
  }

  const query = await searchParams;
  const rulesSelected = getSearchValue(query.rules) === "selected";

  return <OnboardingContent rulesSelected={rulesSelected} />;
}

export function OnboardingContent({
  rulesSelected = false,
}: {
  rulesSelected?: boolean;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-300">
          RefundHold onboarding
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-50">
          Start safely
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-300">
          Walk through the demo setup rules and review flow without moving live
          Stripe money.
        </p>
      </div>

      <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <OnboardingSection step="1" title="Choose mode">
            <div className="grid gap-3 sm:grid-cols-2">
              {modes.map((mode) => (
                <div
                  className="rounded-lg border border-zinc-800 bg-zinc-950 p-4"
                  key={mode.title}
                >
                  <p className="text-sm font-semibold text-zinc-50">
                    {mode.title}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-zinc-300">
                    {mode.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 rounded-md border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-semibold text-amber-100">
              Live refunds are blocked in v1.
            </p>
          </OnboardingSection>

          <OnboardingSection step="2" title="Confirm refund rules">
            <div className="grid gap-3 sm:grid-cols-3">
              {rules.map((rule) => (
                <p
                  className="rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm font-semibold text-zinc-50"
                  key={rule}
                >
                  {rule}
                </p>
              ))}
            </div>
            <form action="/app/onboarding" className="mt-4" method="get">
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                name="rules"
                type="submit"
                value="selected"
              >
                Use these rules
              </button>
            </form>
            {rulesSelected ? (
              <div
                aria-live="polite"
                className="mt-4 rounded-md border border-emerald-300/40 bg-emerald-300/10 px-4 py-3 text-sm leading-6 text-emerald-100"
              >
                <p className="font-semibold">Demo rules selected.</p>
                <p>
                  Under $50 is allowed, $50-$500 needs review, and over $500 is
                  blocked.
                </p>
              </div>
            ) : null}
          </OnboardingSection>

          <OnboardingSection step="3" title="Send first refund request">
            <p className="text-sm leading-6 text-zinc-300">
              In this private demo, sample refund requests are already
              available in the reviewer queue. Use the queue to review, approve,
              reject, and inspect the audit trail.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              href="/app/refund-requests"
            >
              Open refund requests
            </Link>
            <details className="mt-5 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <summary className="cursor-pointer text-sm font-semibold text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300">
                Developer API example
              </summary>
              <p className="mt-4 text-sm leading-6 text-zinc-300">
                Use this when integrating your own AI support agent.
              </p>
              <CommandBlock value={refundRequestCurl} />
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Do not use Stripe secrets here.
              </p>
            </details>
          </OnboardingSection>

          <OnboardingSection step="4" title="Review held refund">
            <p className="text-sm leading-6 text-zinc-300">
              Refunds that need human approval appear in the reviewer dashboard
              before they can continue.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              href="/app/refund-requests"
            >
              Open refund requests
            </Link>
          </OnboardingSection>

          <OnboardingSection step="5" title="View audit trail">
            <p className="text-sm leading-6 text-zinc-300">
              After approval or rejection, RefundHold records the AI proposal,
              policy result, reviewer decision, and outcome.
            </p>
            <Link
              className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              href="/app/refund-requests"
            >
              Open refund requests
            </Link>
          </OnboardingSection>
        </div>

        <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
          <p className="text-sm font-semibold text-zinc-50">Safe start</p>
          <div className="mt-4 space-y-3 text-sm leading-6 text-zinc-300">
            <p>Use demo simulation first.</p>
            <p>Keep Stripe test-mode separate from demo simulation.</p>
            <p>Review the held refund before any execution step.</p>
          </div>
          <Link
            className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-emerald-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
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
    <section className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-400 text-sm font-semibold text-zinc-950">
          {step}
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-zinc-50">
          {title}
        </h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CommandBlock({ value }: { value: string }) {
  return (
    <pre className="mt-4 max-w-full overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">
      <code>{value}</code>
    </pre>
  );
}

function getSearchValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
