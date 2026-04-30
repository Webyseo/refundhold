import Link from "next/link";

const beforeYouStart = [
  "You have access to a Stripe test account.",
  "You can create restricted test keys.",
  "You can create Stripe test charges or PaymentIntents.",
  "You understand that no live Stripe keys should be used.",
  "RefundHold live refunds remain blocked in v1.",
  "You have a valid RefundHold demo agent API key for the controlled environment.",
];

const refundHoldSettings = [
  [
    "Demo agent API key",
    "Preferred: REFUNDHOLD_DEMO_AGENT_API_KEY. Legacy fallback: AUTHRAIL_DEMO_AGENT_API_KEY. Use a private local value and rerun pnpm db:seed:demo after changing it.",
  ],
  [
    "Enable Stripe test-mode",
    "Current supported setting: AUTHRAIL_STRIPE_TEST_MODE_ENABLED=true.",
  ],
  [
    "Enable Stripe test refunds",
    "Current supported setting: AUTHRAIL_STRIPE_TEST_REFUNDS_ENABLED=true when the controlled pilot should execute Stripe test refunds.",
  ],
  [
    "Stripe test secret key",
    "Current supported setting: AUTHRAIL_STRIPE_TEST_SECRET_KEY=<stripe_test_or_restricted_test_key>. Use a test-mode secret or restricted test key only.",
  ],
  [
    "Stripe test webhooks",
    "If webhooks are used, set AUTHRAIL_STRIPE_WEBHOOKS_ENABLED=true and AUTHRAIL_STRIPE_WEBHOOK_TEST_SECRET=<stripe_test_webhook_signing_secret>.",
  ],
  [
    "Live refunds",
    "AUTHRAIL_STRIPE_LIVE_REFUNDS_ENABLED must remain false. The current config rejects this flag when it is enabled.",
  ],
];

const reviewSteps = [
  "Refunds that need human approval appear in /app/refund-requests.",
  "The reviewer checks AI reason, order context, policy match, evidence, and audit trail.",
  "The reviewer approves or rejects the refund request.",
  "In Stripe test-mode, execution must stay limited to Stripe test objects.",
];

const liveBlockedChecks = [
  "Live Stripe key is not configured.",
  "Live refund flag remains disabled or blocked.",
  "/app/stripe shows live refunds blocked.",
  "/security states live refunds are blocked in v1.",
  "Test request uses Stripe test-mode only.",
  "No live Stripe dashboard event is created.",
  "RefundHold responses and audit trail show test-mode or demo evidence.",
];

const troubleshootingItems = [
  [
    "Invalid agent API key",
    "Configure REFUNDHOLD_DEMO_AGENT_API_KEY and rerun pnpm db:seed:demo so the controlled environment stores the matching hash.",
  ],
  [
    "Wrong database or Postgres",
    "Check that DATABASE_URL points to the intended local Docker Postgres before running the app or seed.",
  ],
  [
    "Stripe test-mode setup required",
    "Confirm the test-mode settings, restricted test key, and Stripe test object before sending a refund request.",
  ],
  [
    "Webhook not received",
    "Confirm Stripe CLI forwarding or the Stripe test webhook endpoint is running and using the test webhook signing secret.",
  ],
  [
    "Live mode confusion",
    "Stop and verify live refunds remain blocked before continuing the pilot.",
  ],
];

const notProvenYet = [
  "It does not prove production live-money readiness.",
  "It does not replace final auth/RBAC review.",
  "It does not replace idempotency/retry review.",
  "It does not replace webhook reconciliation review.",
  "It does not replace legal, privacy, or security review.",
  "It does not prove audit export readiness.",
];

const testModeCurl = `curl -X POST http://localhost:3000/api/v1/refund-requests \\
  -H "Authorization: Bearer <agent_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "connector": "stripe_test",
    "action": "refund.create",
    "resource": "stripe.payment_intent",
    "parameters": {
      "payment_intent_id": "pi_test_...",
      "amount_minor": 10000,
      "reason": "requested_by_customer"
    },
    "context": {
      "source": "controlled_stripe_pilot",
      "ai_agent_reason": "Controlled Stripe test-mode refund validation.",
      "order_summary": "Test order for controlled pilot"
    }
  }'`;

export default function StripeTestModePage() {
  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-12 text-zinc-50">
      <section className="mx-auto max-w-5xl">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold runbook
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Stripe test-mode setup
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Test RefundHold with Stripe test objects only. Live refunds are
            blocked in v1.
          </p>
        </div>

        <div className="mt-10 rounded-lg border border-emerald-400/40 bg-emerald-400/10 p-5">
          <p className="text-sm font-semibold text-emerald-200">
            Controlled test-mode pilot
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            Use this page to prepare Stripe test-mode safely. Do not use live
            Stripe keys, live Stripe object IDs, or live-money production flows.
          </p>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <RunbookSection title="What this guide is for">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>Demo simulation does not call Stripe.</p>
                <p>Stripe test-mode uses Stripe test objects only.</p>
                <p>Live refunds are blocked in v1.</p>
                <p>
                  This guide is for controlled test-mode pilots, not production
                  live-money use.
                </p>
              </div>
            </RunbookSection>

            <RunbookSection title="Before you start">
              <Checklist items={beforeYouStart} />
            </RunbookSection>

            <RunbookSection title="Required RefundHold settings">
              <p className="text-sm leading-6 text-zinc-300">
                These are the safe setting names currently visible in the repo.
                Use placeholders in docs and private values in the controlled
                environment. Do not commit real keys.
              </p>
              <DefinitionList items={refundHoldSettings} />
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                REFUNDHOLD_* is preferred where supported. The Stripe settings
                currently use legacy AUTHRAIL_* names in code and environment
                examples.
              </p>
            </RunbookSection>

            <RunbookSection title="Stripe restricted test key">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  Create a restricted key in Stripe test-mode and grant the
                  minimum permissions needed for test refunds in the pilot.
                </p>
                <p>Do not use live keys.</p>
                <p>
                  Do not give Stripe secret keys to the AI support agent. The AI
                  support agent should call RefundHold, not Stripe directly.
                </p>
                <p>
                  RefundHold or the trusted backend boundary should hold the
                  Stripe capability.
                </p>
              </div>
            </RunbookSection>

            <RunbookSection title="Create a Stripe test object">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  Create or use a Stripe test PaymentIntent, Charge, or test
                  payment object supported by the current implementation.
                </p>
                <p>Use only Stripe test-mode objects.</p>
                <p>
                  Keep the PaymentIntent ID or Charge ID available for the
                  refund request payload.
                </p>
              </div>
            </RunbookSection>

            <RunbookSection title="Send a test-mode refund proposal">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  Send the refund request to POST /api/v1/refund-requests with
                  Authorization: Bearer &lt;agent_api_key&gt;.
                </p>
                <p>
                  The current public shortcut supports amount, currency,
                  reason, and stripe_mode: demo_simulation for demo simulation.
                  For Stripe test-mode, the supported pilot selector is
                  connector: stripe_test in the compatibility payload. Do not
                  send unsupported alternate values.
                </p>
                <p>
                  In the Stripe test-mode payload, RefundHold expects a
                  PaymentIntent ID or Charge ID, amount_minor, and reason. The
                  current reflection path reads currency from the Stripe test
                  object.
                </p>
                <p>
                  Do not use live Stripe object IDs or live Stripe keys.
                </p>
              </div>
              <CommandBlock value={testModeCurl} />
            </RunbookSection>

            <RunbookSection title="Review and approve">
              <Checklist items={reviewSteps} />
            </RunbookSection>

            <RunbookSection title="Webhooks and reconciliation">
              <div className="space-y-3 text-sm leading-6 text-zinc-300">
                <p>
                  If webhooks are enabled in the controlled pilot, configure
                  Stripe CLI or a Stripe test webhook endpoint using test-mode
                  only.
                </p>
                <p>
                  Confirm the webhook signing secret uses the test-mode setting.
                </p>
                <p>
                  Verify reconciliation status in RefundHold if the current app
                  exposes it in evidence or audit trail views.
                </p>
                <p>
                  If webhook reconciliation is not fully ready for the pilot,
                  review that gap before any production live-money use.
                </p>
              </div>
            </RunbookSection>

            <RunbookSection title="Prove live refunds are blocked">
              <Checklist items={liveBlockedChecks} />
            </RunbookSection>

            <RunbookSection title="Troubleshooting">
              <DefinitionList items={troubleshootingItems} />
            </RunbookSection>

            <RunbookSection title="What this does not prove yet">
              <Checklist items={notProvenYet} />
            </RunbookSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <h2 className="text-xl font-semibold text-zinc-50">
              Next actions
            </h2>
            <div className="mt-5 flex flex-col gap-3">
              <CtaLink href="/docs/api">Read API reference</CtaLink>
              <CtaLink href="/docs/prevent-bypass">
                Read bypass prevention
              </CtaLink>
              <CtaLink href="/demo/reviewer">
                Open reviewer dashboard demo
              </CtaLink>
              <CtaLink href="/docs/quickstart">Open quickstart</CtaLink>
              <CtaLink href="/contact">Contact for controlled pilot</CtaLink>
              <CtaLink href="/security">View security boundary</CtaLink>
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

function RunbookSection({
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

function DefinitionList({ items }: { items: string[][] }) {
  return (
    <dl className="mt-5 grid gap-3">
      {items.map(([label, value]) => (
        <div
          className="rounded-md border border-zinc-800 bg-zinc-950/70 p-4"
          key={label}
        >
          <dt className="text-sm font-semibold text-zinc-50">{label}</dt>
          <dd className="mt-2 text-sm leading-6 text-zinc-300">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function CommandBlock({ value }: { value: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm leading-6 text-zinc-100">
      <code>{value}</code>
    </pre>
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
