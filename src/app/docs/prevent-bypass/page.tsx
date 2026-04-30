import Link from "next/link";

const architectureFlow = [
  "Customer asks for refund",
  "AI support agent evaluates the request",
  "AI support agent sends refund proposal to RefundHold",
  "RefundHold checks policy",
  "RefundHold returns allowed, needs_review, or blocked",
  "Reviewer approves or rejects when needed",
  "trusted execution boundary records or executes the approved action",
  "Audit trail is recorded",
];

const agentCanDo = [
  "collect customer context",
  "recommend a refund",
  "send a refund proposal to RefundHold",
  "explain to the customer that a refund is waiting for human review",
  "read RefundHold's public decision response if integrated by the business",
];

const agentShouldNotDo = [
  "hold Stripe secret keys",
  "call Stripe refunds directly",
  "bypass RefundHold approval",
  "retry live-money operations blindly",
  "execute refunds after a human decision unless the trusted backend explicitly allows it",
  "decide production refund policy by itself",
];

const refundHoldControls = [
  "evaluate refund proposals against policy",
  "hold risky refunds for human review",
  "record reviewer decisions",
  "record demo or test-mode execution evidence",
  "keep an audit trail of the decision path",
];

const cannotControl = [
  "the AI agent has direct Stripe secret keys",
  "another backend endpoint can refund without checking RefundHold",
  "operators manually refund directly in Stripe outside the process",
  "production infrastructure allows unreviewed refund paths",
  "live mode is enabled without explicit controls",
];

const approvalGrantFields = [
  "refund request id",
  "amount",
  "currency",
  "Stripe mode",
  "reviewer decision",
  "timestamp",
  "execution outcome",
];

const bypassChecklist = [
  "AI agent has no Stripe secret key.",
  "AI agent calls RefundHold, not Stripe.",
  "Backend refund routes require RefundHold decision or approval.",
  "Reviewer decisions are recorded.",
  "Execution outcome is recorded.",
  "Stripe test-mode is verified before any pilot.",
  "Live refund flag remains blocked.",
  "Manual Stripe dashboard refunds are treated as out-of-band and should be operationally controlled.",
  "Audit trail is reviewed after each test.",
];

const productionRequirements = [
  "auth/RBAC review",
  "idempotency/retry review",
  "webhook reconciliation review",
  "key management review",
  "audit export",
  "privacy/legal review",
  "backup/rollback",
  "explicit live-mode approval",
];

export default function PreventBypassPage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-50">
      <section className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold architecture
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Preventing AI refund bypass
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Keep Stripe refund capability out of the AI agent. Let the agent
            propose refunds to RefundHold, then require policy or human
            approval before anything can continue.
          </p>
        </div>

        <div className="mt-10 rounded-lg border border-amber-300/50 bg-amber-300/10 p-5">
          <p className="text-sm font-semibold text-amber-200">
            Architecture boundary
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            If an AI agent already has a live Stripe secret key, RefundHold
            cannot prevent that agent from bypassing RefundHold. The safe
            architecture is to remove direct Stripe refund capability from the
            agent.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <DocsSection title="The core rule">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  The AI support agent should never receive Stripe secret keys
                  or direct refund permissions.
                </p>
                <p>The agent proposes a refund to RefundHold.</p>
                <p>
                  RefundHold returns allowed, needs_review, or blocked.
                </p>
                <p>
                  If review is required, the refund waits for a human decision.
                </p>
              </div>
            </DocsSection>

            <DocsSection title="Recommended architecture">
              <ol className="space-y-3">
                {architectureFlow.map((item, index) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-semibold text-zinc-950">
                      {index + 1}
                    </span>
                    <span className="pt-0.5">{item}</span>
                  </li>
                ))}
              </ol>
            </DocsSection>

            <DocsSection title="What the AI agent can do">
              <Checklist items={agentCanDo} />
            </DocsSection>

            <DocsSection title="What the AI agent should not do">
              <Checklist items={agentShouldNotDo} />
            </DocsSection>

            <DocsSection title="What RefundHold controls">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold can control the approval workflow when it sits in
                front of the Stripe refund capability.
              </p>
              <Checklist items={refundHoldControls} />
            </DocsSection>

            <DocsSection title="What RefundHold cannot control by itself">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold cannot prevent bypass if:
              </p>
              <Checklist items={cannotControl} />
            </DocsSection>

            <DocsSection title="Execution grants and approval boundary">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  A safe design treats human approval as a narrow permission for
                  one specific refund request.
                </p>
                <p>
                  The approval record should behave like a narrow grant, not a
                  broad permission. It should be tied to:
                </p>
              </div>
              <Checklist items={approvalGrantFields} />
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                RefundHold records approval and execution evidence today. Treat
                production-grade grant design as a readiness review item before
                any live-money use.
              </p>
            </DocsSection>

            <DocsSection title="Stripe key isolation">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>Use restricted Stripe keys for test-mode pilots.</p>
                <p>Do not give Stripe keys to the AI support agent.</p>
                <p>
                  Store Stripe keys only in the trusted RefundHold/backend
                  environment.
                </p>
                <p>
                  For production, restricted key scope and operational ownership
                  must be reviewed before any live refunds.
                </p>
              </div>
            </DocsSection>

            <DocsSection title="Test-mode and live mode">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>Demo simulation does not call Stripe.</p>
                <p>Stripe test-mode uses Stripe test objects only.</p>
                <p>Live refunds are blocked in v1.</p>
                <p>Do not use live Stripe keys during pilots.</p>
              </div>
            </DocsSection>

            <DocsSection title="Bypass-prevention checklist">
              <Checklist items={bypassChecklist} />
            </DocsSection>

            <DocsSection title="What this means for pilots">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  For a demo simulation pilot, verify the proposal, policy,
                  approval, and audit trail.
                </p>
                <p>
                  For a Stripe test-mode pilot, verify that only Stripe test
                  objects are used.
                </p>
                <p>
                  The API reference documents the current execution model,
                  decision values, and retry limits for pilots.
                </p>
                <p>
                  For live-money production, require{" "}
                  {productionRequirements.join(", ")}.
                </p>
              </div>
            </DocsSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-xl font-semibold text-zinc-50">
              Related docs
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              <CtaLink href="/docs/test-mode-runbook">
                Exact test-mode runbook
              </CtaLink>
              <CtaLink href="/docs/pilot-acceptance">
                Pilot acceptance contract
              </CtaLink>
              <CtaLink href="/docs/test-mode-pilot">
                Read test-mode pilot contract
              </CtaLink>
              <CtaLink href="/docs/api">Read API reference</CtaLink>
              <CtaLink href="/docs/stripe-test-mode">
                Read Stripe test-mode setup
              </CtaLink>
              <CtaLink href="/demo/reviewer">
                Try reviewer dashboard demo
              </CtaLink>
              <CtaLink href="/security">View security boundary</CtaLink>
              <CtaLink href="/contact">Contact for controlled pilot</CtaLink>
            </div>
            <p className="mt-6 border-t border-zinc-800 pt-5 text-xs leading-5 text-zinc-300">
              RefundHold is not affiliated with, endorsed by, or sponsored by
              Stripe. Stripe is a trademark of Stripe, Inc.
            </p>
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
    <ul className="mt-5 space-y-3">
      {items.map((item) => (
        <li className="flex gap-3 text-sm leading-6 text-zinc-300" key={item}>
          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
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
