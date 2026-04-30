import Link from "next/link";

const provesItems = [
  "An AI support agent can send a refund proposal to RefundHold.",
  "RefundHold can return allowed, needs_review, or blocked.",
  "A medium-risk refund can be held for human review.",
  "A reviewer can approve or reject the refund.",
  "Execution can be recorded in demo simulation or tested with Stripe test objects in a controlled pilot.",
  "The audit trail shows proposal, policy result, reviewer decision, execution outcome, and safety evidence.",
  "The AI agent does not need Stripe secret keys.",
  "Live refunds remain blocked.",
];

const doesNotProveItems = [
  "It does not prove production live-money readiness.",
  "It does not prove final RBAC.",
  "It does not prove final public idempotency keys.",
  "It does not prove stable production webhooks.",
  "It does not prove audit export or immutable legal archiving.",
  "It does not prove full compliance, fraud prevention, or legal readiness.",
  "It does not prove controls over manual refunds made directly in Stripe.",
  "It does not enable live refunds.",
];

const responsibilityRows = [
  [
    "AI support agent",
    "Proposes the refund; sends context to RefundHold; does not call Stripe; does not hold Stripe secret keys; stops when RefundHold returns needs_review or blocked.",
  ],
  [
    "RefundHold",
    "Receives the refund proposal; evaluates policy; returns the decision; holds refunds for human approval when required; records audit trail evidence.",
  ],
  [
    "Human reviewer",
    "Reviews AI reason, policy match, evidence, amount, mode, and customer context; approves or rejects; does not treat approval as live execution.",
  ],
  [
    "Trusted backend or RefundHold-controlled execution boundary",
    "Holds Stripe test-mode capability; verifies RefundHold decision before execution; records execution outcome; keeps live refunds blocked.",
  ],
  [
    "Stripe test-mode",
    "Receives only test-mode operations in a controlled pilot; must never receive live operations during v1 pilot.",
  ],
];

const stateRows = [
  [
    "allowed",
    "trusted backend",
    "continue only through controlled backend path",
    "test-mode only if configured",
    "decision returned and no agent-side Stripe call",
  ],
  [
    "needs_review",
    "human reviewer",
    "approve or reject",
    "none before approval",
    "refund appears in reviewer queue",
  ],
  [
    "approved",
    "trusted backend or RefundHold-controlled boundary",
    "execute controlled demo/test path",
    "test objects only in test-mode",
    "reviewer decision recorded",
  ],
  [
    "rejected",
    "support/operator follow-up",
    "do not execute; inform customer or escalate",
    "none",
    "rejection recorded and automatic continuation blocked",
  ],
  [
    "executed",
    "system or trusted backend",
    "audit and reconcile",
    "demo simulation none; test-mode test objects only",
    "execution outcome recorded",
  ],
  [
    "blocked",
    "AI agent and operator",
    "do not retry automatically; safe refusal or escalation",
    "none",
    "blocked decision returned",
  ],
  [
    "failed",
    "operator",
    "inspect failure, do not blindly retry",
    "depends on controlled test-mode failure",
    "failure recorded and live refunds remain blocked",
  ],
];

const pilotFlow = [
  "Confirm the AI agent has no Stripe secret keys.",
  "Configure controlled demo agent API key.",
  "If Stripe test-mode is in scope, configure restricted Stripe test-mode settings.",
  "Send POST /api/v1/refund-requests.",
  "Confirm response includes refund_request_id and decision.",
  "Use a medium refund that returns needs_review.",
  "Open reviewer dashboard.",
  "Confirm evidence, policy, mode, and audit trail.",
  "Approve or reject.",
  "If approved, run controlled execute step only in demo simulation or Stripe test-mode.",
  "Confirm audit trail and outcome.",
  "Confirm live Stripe dashboard shows no live refund event.",
];

const goItems = [
  "Home and public demo are understood without explanation.",
  "/demo/reviewer shows clean evidence and audit trail.",
  "/docs/api is sufficient for the developer to call the API.",
  "/docs/test-mode-pilot explains the lifecycle.",
  "/docs/prevent-bypass makes clear the AI agent must not hold Stripe keys.",
  "Refund request returns allowed, needs_review, or blocked.",
  "needs_review creates a reviewable refund.",
  "approve and reject can be tested.",
  "execution is recorded only in demo simulation or controlled Stripe test-mode.",
  "live refunds remain blocked.",
  "no live Stripe event is created.",
  "tester can explain approval versus execution.",
];

const noGoItems = [
  "tester thinks the AI agent can call Stripe directly.",
  "tester thinks live refunds are enabled.",
  "API key setup blocks the test.",
  "needs_review does not appear in the reviewer flow.",
  "approve/reject state is confusing.",
  "execution behavior is unclear.",
  "audit trail lacks enough evidence.",
  "Stripe test-mode and live mode are confused.",
  "bypass-prevention architecture is not understood.",
];

const evidenceItems = [
  "refund_request_id",
  "amount and currency",
  "AI reason",
  "customer/order context if available",
  "policy result",
  "reviewer decision",
  "Stripe mode",
  "live mode: No",
  "idempotency reference if available",
  "execution outcome",
  "audit timeline",
  "no live Stripe event",
];

const outOfScopeItems = [
  "production live refunds",
  "public self-serve onboarding",
  "final RBAC",
  "final idempotency contract",
  "stable webhook callbacks",
  "audit export",
  "Slack or Teams approvals",
  "Stripe OAuth",
  "no-code policy builder",
  "pricing negotiation",
  "legal/compliance sign-off",
];

const successItems = [
  "prepare Stripe test-mode hardening tasks",
  "define webhook/callback contract",
  "define public idempotency key contract",
  "define RBAC/reviewer roles",
  "define audit export requirements",
  "discuss commercial pilot terms",
];

const unclearIntegrationItems = [
  "improve API docs and examples",
  "improve agent behavior guidance",
  "improve backend execution model docs",
];

const unclearValueItems = [
  "revise demo/reviewer evidence and home positioning before adding features",
];

export default function PilotAcceptancePage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-50">
      <section className="mx-auto max-w-6xl">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold docs
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Pilot acceptance contract
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            What a controlled RefundHold test-mode pilot proves, what it does
            not prove, and how success is evaluated. Live refunds are blocked in
            v1.
          </p>
        </div>

        <div className="mt-10 rounded-lg border border-amber-300/50 bg-amber-300/10 p-5">
          <p className="text-sm font-semibold text-amber-200">
            Controlled pilot boundary
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            This contract is for demo simulation or Stripe test-mode only. It
            does not claim production live-money readiness and does not enable
            live refunds. For this controlled pilot, live refunds are blocked
            in v1.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <DocsSection title="Pilot purpose">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  The pilot validates whether RefundHold can sit between an AI
                  support agent and Stripe refund execution, evaluate refund
                  proposals, hold risky refunds for review, record human
                  decisions, and produce an audit trail using demo simulation or
                  Stripe test-mode.
                </p>
                <p>
                  This is a controlled test-mode pilot, not a production
                  live-money launch.
                </p>
              </div>
            </DocsSection>

            <DocsSection title="What the pilot proves">
              <Checklist items={provesItems} />
            </DocsSection>

            <DocsSection title="What the pilot does not prove">
              <Checklist items={doesNotProveItems} />
            </DocsSection>

            <DocsSection title="Pilot architecture responsibilities">
              <TwoColumnTable
                columns={["Actor", "Responsibility"]}
                rows={responsibilityRows}
              />
            </DocsSection>

            <DocsSection title="State matrix">
              <StateTable rows={stateRows} />
            </DocsSection>

            <DocsSection title="Pilot flow to run">
              <ol className="space-y-3">
                {pilotFlow.map((item, index) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-semibold text-zinc-950">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
            </DocsSection>

            <DocsSection title="Acceptance criteria">
              <div className="grid gap-5 lg:grid-cols-2">
                <ChecklistPanel items={goItems} title="Go if" />
                <ChecklistPanel items={noGoItems} title="No-go if" />
              </div>
            </DocsSection>

            <DocsSection title="Evidence required in the pilot">
              <Checklist items={evidenceItems} />
            </DocsSection>

            <DocsSection title="Out-of-scope for the pilot">
              <Checklist items={outOfScopeItems} />
            </DocsSection>

            <DocsSection title="After the pilot">
              <div className="grid gap-4 lg:grid-cols-3">
                <ChecklistPanel
                  items={successItems}
                  title="If the pilot succeeds"
                />
                <ChecklistPanel
                  items={unclearIntegrationItems}
                  title="If integration is unclear"
                />
                <ChecklistPanel
                  items={unclearValueItems}
                  title="If product value is unclear"
                />
              </div>
            </DocsSection>

            <DocsSection title="Related docs">
              <div className="grid gap-3 sm:grid-cols-2">
                <CtaLink href="/docs/test-mode-pilot">
                  Test-mode pilot contract
                </CtaLink>
                <CtaLink href="/docs/api">API reference</CtaLink>
                <CtaLink href="/docs/stripe-test-mode">
                  Stripe test-mode setup
                </CtaLink>
                <CtaLink href="/docs/prevent-bypass">Prevent bypass</CtaLink>
                <CtaLink href="/demo/reviewer">
                  Reviewer dashboard demo
                </CtaLink>
                <CtaLink href="/docs/quickstart">Quickstart</CtaLink>
                <CtaLink href="/contact">Contact</CtaLink>
              </div>
            </DocsSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-xl font-semibold text-zinc-50">
              Pilot decision
            </h2>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              Use this page to decide whether a controlled Stripe test-mode
              pilot is ready to run, whether the evidence is sufficient, and
              what must remain out of scope.
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <CtaLink href="/docs/test-mode-pilot">
                Test-mode pilot contract
              </CtaLink>
              <CtaLink href="/docs/api">API reference</CtaLink>
              <CtaLink href="/demo/reviewer">
                Reviewer dashboard demo
              </CtaLink>
              <CtaLink href="/contact">Contact</CtaLink>
            </div>
            <div className="mt-6 border-t border-zinc-800 pt-5 text-sm leading-6 text-zinc-300">
              <p className="font-semibold text-zinc-50">Success signal</p>
              <p className="mt-2">
                The tester can explain proposal, policy decision, human
                approval, controlled execution, and audit trail without assuming
                live refunds are enabled.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function DocsSection({
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

function Checklist({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li className="flex gap-3 text-sm leading-6 text-zinc-300" key={item}>
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function ChecklistPanel({ items, title }: { items: string[]; title: string }) {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-950/70 p-4">
      <h3 className="text-base font-semibold text-zinc-50">{title}</h3>
      <div className="mt-4">
        <Checklist items={items} />
      </div>
    </section>
  );
}

function TwoColumnTable({
  columns,
  rows,
}: {
  columns: [string, string];
  rows: string[][];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-100">
            {columns.map((column) => (
              <th className="py-3 pr-4 font-semibold" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([first, second]) => (
            <tr className="border-b border-zinc-800 last:border-b-0" key={first}>
              <td className="py-3 pr-4 font-semibold text-emerald-200">
                {first}
              </td>
              <td className="py-3 text-zinc-300">{second}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StateTable({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-zinc-100">
            {[
              "State",
              "Responsible actor",
              "Allowed next action",
              "Stripe involvement",
              "Pilot success evidence",
            ].map((column) => (
              <th className="py-3 pr-4 font-semibold" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([state, actor, action, stripe, evidence]) => (
            <tr className="border-b border-zinc-800 last:border-b-0" key={state}>
              <td className="py-3 pr-4 font-mono text-emerald-200">{state}</td>
              <td className="py-3 pr-4 text-zinc-300">{actor}</td>
              <td className="py-3 pr-4 text-zinc-300">{action}</td>
              <td className="py-3 pr-4 text-zinc-300">{stripe}</td>
              <td className="py-3 text-zinc-300">{evidence}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CtaLink({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-center text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
      href={href}
    >
      {children}
    </Link>
  );
}
