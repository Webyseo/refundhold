import Link from "next/link";

import {
  ActivationEventView,
  CopyCurlButton,
} from "../../activation-event-client";

const testFlow = [
  "AI support agent proposes a refund",
  "RefundHold checks the refund policy",
  "The refund is held for human review",
  "A reviewer approves or rejects it",
  "RefundHold records the audit trail",
];

const safetyItems = [
  "Demo simulation does not call Stripe.",
  "Stripe test-mode uses Stripe test objects only.",
  "Live refunds are blocked in v1.",
  "RefundHold is not affiliated with, endorsed by, or sponsored by Stripe.",
];

const demoPolicy = [
  "Under $50 → allowed",
  "$50–$500 → needs human review",
  "Over $500 → blocked",
];

const localCommands = [
  "pnpm install",
  "cp .env.example .env",
  "pnpm db:up",
  "pnpm db:migrate",
  "pnpm db:seed:demo",
  "pnpm dev",
];

const nextSteps = [
  "Onboarding flow for first held refund",
  "Stripe test-mode setup page",
  "Short public API reference",
];

const demoKeyItems = [
  "Set REFUNDHOLD_DEMO_AGENT_API_KEY in .env before running the demo seed.",
  "Legacy AUTHRAIL_DEMO_AGENT_API_KEY remains supported during the transition.",
  "Use a private local value in the demo format ar_demo_<prefix>_<secret>.",
  "Run pnpm db:seed:demo after setting or changing the key so RefundHold stores the matching hash.",
  "Use that same value as Bearer <agent_api_key> when calling /api/v1/refund-requests.",
  "Never use a live Stripe secret as the agent API key.",
  "Never commit real API keys.",
];

const refundProposalCurl = `curl -X POST http://localhost:3000/api/v1/refund-requests \\
  -H "Authorization: Bearer <agent_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "stripe_mode": "demo_simulation",
    "amount": 42000,
    "currency": "usd",
    "reason": "AI support agent recommends refund"
  }'`;

export default function QuickstartPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-50">
      <ActivationEventView
        eventName="quickstart_viewed"
        metadata={{
          route: "/docs/quickstart",
        }}
      />
      <section className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold quickstart
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            5-minute setup
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Send a demo refund proposal, hold it for review, and see the audit
            trail. No live Stripe money moves.
          </p>
          <p className="mt-5 text-base leading-7 text-zinc-400">
            RefundHold checks refund proposals from AI support agents before
            they reach Stripe. Safe refunds can pass. Risky refunds wait for
            human approval. Every decision is logged.
          </p>
          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              className="inline-flex items-center justify-center rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
              href="/demo"
            >
              Open public demo
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
              href="/app/refund-requests"
            >
              Open reviewer dashboard
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          <QuickstartSection title="What you will test">
            <ol className="space-y-3">
              {testFlow.map((item, index) => (
                <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-semibold text-zinc-950">
                    {index + 1}
                  </span>
                  <span className="pt-0.5">{item}</span>
                </li>
              ))}
            </ol>
          </QuickstartSection>

          <QuickstartSection title="Safety first">
            <ul className="space-y-3">
              {safetyItems.map((item) => (
                <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </QuickstartSection>

          <QuickstartSection title="Demo policy">
            <div className="space-y-3">
              {demoPolicy.map((item) => (
                <p
                  className="rounded-md border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm font-medium text-zinc-100"
                  key={item}
                >
                  {item}
                </p>
              ))}
            </div>
          </QuickstartSection>

          <QuickstartSection title="Try the no-code demo first">
            <p className="text-sm leading-6 text-zinc-300">
              The public demo requires no login, no password, no API key, and
              does not move real money.
            </p>
            <Link
              className="mt-5 inline-flex items-center justify-center rounded-md bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
              href="/demo"
            >
              Open public demo
            </Link>
          </QuickstartSection>
        </div>

        <div className="mt-5 grid gap-5">
          <QuickstartSection title="Run locally">
            <p className="text-sm leading-6 text-zinc-300">
              From the repository root, copy the example environment file, set
              the demo agent API key described below, then run:
            </p>
            <CommandBlock value={localCommands.join("\n")} />
            <p className="mt-5 text-sm font-medium text-zinc-100">
              Open http://localhost:3000/demo
            </p>
          </QuickstartSection>

          <QuickstartSection title="Demo agent API key">
            <p className="text-sm leading-6 text-zinc-300">
              Demo simulation requests are authenticated with your controlled
              demo agent API key. The seed stores only a hash of this value.
            </p>
            <ul className="mt-4 space-y-3">
              {demoKeyItems.map((item) => (
                <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </QuickstartSection>

          <QuickstartSection title="Send a refund proposal from an agent">
            <div className="space-y-3 text-sm leading-6 text-zinc-300">
              <p>
                Preferred public endpoint: /api/v1/refund-requests.
              </p>
              <p>
                Temporary compatibility endpoint still available:
                /api/v1/action-requests.
              </p>
            </div>
            <CommandBlock value={refundProposalCurl} />
            <CopyCurlButton
              command={refundProposalCurl}
              eventName="api_curl_copied"
              metadata={{
                route: "/docs/quickstart",
                step: "send_refund_proposal",
                outcome: "curl_copied",
              }}
            />
            <p className="mt-5 text-sm leading-6 text-zinc-400">
              The public endpoint returns refund_request_id and links reviewers
              to /app/refund-requests.
            </p>
          </QuickstartSection>

          <QuickstartSection title="Review the held refund">
            <p className="text-sm leading-6 text-zinc-300">
              Refunds that need human approval appear in the reviewer
              dashboard.
            </p>
            <div className="mt-4 space-y-2 text-sm leading-6 text-zinc-400">
              <p>Approve: POST /api/v1/refund-requests/[id]/approve</p>
              <p>Reject: POST /api/v1/refund-requests/[id]/reject</p>
              <p>
                Execute or record demo execution: POST
                /api/v1/refund-requests/[id]/execute
              </p>
            </div>
            <Link
              className="mt-5 inline-flex items-center justify-center rounded-md bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
              href="/app/refund-requests"
            >
              Open reviewer dashboard
            </Link>
          </QuickstartSection>

          <QuickstartSection title="What to build next">
            <ul className="space-y-3">
              {nextSteps.map((item) => (
                <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                  <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </QuickstartSection>
        </div>
      </section>
    </main>
  );
}

function QuickstartSection({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-xl font-semibold text-zinc-50">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function CommandBlock({ value }: { value: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">
      <code>{value}</code>
    </pre>
  );
}
