import Link from "next/link";

import { PublicHeader } from "../public-header";

const controlledFlow = [
  "AI support agent proposes a refund",
  "RefundHold checks the refund policy",
  "Risky refunds wait for human approval",
  "Reviewers approve or reject",
  "RefundHold records the audit trail",
];

const safetyBoundaries = [
  "Demo simulation does not call Stripe.",
  "Stripe test-mode uses Stripe test objects only.",
  "Live refunds are blocked in v1.",
  "RefundHold does not move live Stripe money in this version.",
];

const notRefundHold = [
  "RefundHold is not a replacement for Stripe.",
  "RefundHold is not an IAM or SSO product.",
  "RefundHold is not a complete compliance platform.",
  "RefundHold does not provide legal, financial, tax, or accounting advice.",
  "RefundHold does not prevent all refund fraud.",
  "RefundHold is not affiliated with, endorsed by, or sponsored by Stripe.",
];

const auditEvidence = [
  "refund proposal",
  "policy result",
  "reviewer decision",
  "execution outcome",
  "timestamps where available",
];

const futureRequirements = [
  "production authentication review",
  "RBAC review",
  "restricted Stripe key setup",
  "webhook reconciliation review",
  "audit export",
  "terms and privacy policy",
  "backup and rollback process",
  "explicit live-mode review before any live refunds",
];

export default function SecurityPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <PublicHeader />
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold safety
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Security and safety
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            RefundHold adds approval controls around AI-generated Stripe
            refunds. Live refunds are blocked in v1.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <SecuritySection title="What RefundHold controls">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold sits between an AI support agent and Stripe refund
                execution. It checks refund proposals against rules, holds risky
                refunds for human review, and records decisions in an audit
                trail.
              </p>
              <ul className="mt-5 space-y-3">
                {controlledFlow.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SecuritySection>

            <SecuritySection title="Current safety boundary">
              <ul className="space-y-3">
                {safetyBoundaries.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SecuritySection>

            <SecuritySection title="What RefundHold is not">
              <ul className="space-y-3">
                {notRefundHold.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-zinc-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SecuritySection>

            <SecuritySection title="Data and audit trail">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold records operational evidence around a refund request:
              </p>
              <ul className="mt-5 space-y-3">
                {auditEvidence.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-sm leading-6 text-zinc-400">
                Audit export is planned for pilot readiness.
              </p>
            </SecuritySection>

            <SecuritySection title="Production readiness">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold is currently suitable for demo simulation and Stripe
                test-mode pilots. Live-money production use requires additional
                readiness work.
              </p>
              <ul className="mt-5 space-y-3">
                {futureRequirements.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SecuritySection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-sm font-semibold text-zinc-50">
              Safe testing path
            </p>
            <div className="mt-5 flex flex-col gap-3">
              <Link
                className="inline-flex w-full items-center justify-center rounded-md bg-emerald-300 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-200"
                href="/demo"
              >
                Try public demo
              </Link>
              <Link
                className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
                href="/docs/prevent-bypass"
              >
                Read bypass prevention
              </Link>
              <Link
                className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
                href="/docs/stripe-test-mode"
              >
                Read test-mode setup
              </Link>
              <Link
                className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
                href="/docs/quickstart"
              >
                Read 5-minute setup
              </Link>
              <Link
                className="inline-flex w-full items-center justify-center rounded-md border border-zinc-700 px-4 py-3 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
                href="/contact"
              >
                Request test-mode pilot
              </Link>
            </div>

            <p className="mt-6 border-t border-zinc-800 pt-5 text-xs leading-5 text-zinc-400">
              RefundHold is not affiliated with, endorsed by, or sponsored by
              Stripe. Stripe is a trademark of Stripe, Inc.
            </p>
            <div className="mt-5 flex flex-wrap gap-4 text-sm font-medium text-zinc-400">
              <Link className="hover:text-zinc-100" href="/privacy">
                Privacy
              </Link>
              <Link className="hover:text-zinc-100" href="/terms">
                Terms
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SecuritySection({
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
