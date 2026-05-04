import Link from "next/link";

import { PublicFooter, PublicHeader } from "../public-header";
import { JsonLd } from "@/components/JsonLd";
import { createPublicPageMetadata, getPublicSeoPage, webPageJsonLd } from "@/lib/seo";

export const metadata = createPublicPageMetadata("/terms");

const termsSeo = getPublicSeoPage("/terms");

const safetyBoundaries = [
  "Demo simulation does not move money.",
  "Stripe test-mode uses Stripe test objects only.",
  "Live refunds are blocked in v1.",
  "RefundHold does not provide legal, financial, tax, or accounting advice.",
  "RefundHold does not prevent all refund fraud.",
];

const readinessItems = [
  "production authentication review",
  "RBAC review",
  "restricted Stripe key setup",
  "webhook reconciliation",
  "audit export",
  "privacy review",
  "terms review",
  "backup and rollback process",
  "explicit live-mode approval",
];

export default function TermsPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <JsonLd
        data={webPageJsonLd({
          title: termsSeo.title,
          description: termsSeo.description,
          path: termsSeo.path,
          type: "Article",
        })}
      />
      <PublicHeader currentPath="/terms" />
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold terms
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Terms
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            RefundHold is available for demo simulation and controlled Stripe
            test-mode pilots. Live refunds are blocked in v1.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <TermsSection title="Current status">
              <p className="text-sm leading-6 text-zinc-300">
                These terms are a plain-language placeholder for early pilot
                discussions and should be reviewed before production use.
              </p>
            </TermsSection>

            <TermsSection title="What RefundHold does">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold helps teams review AI-generated Stripe refund
                proposals before they continue. It applies refund rules, holds
                risky refunds for human approval, and records an audit trail.
              </p>
            </TermsSection>

            <TermsSection title="Safety boundaries">
              <ul className="space-y-3">
                {safetyBoundaries.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </TermsSection>

            <TermsSection title="Stripe disclaimer">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold is not affiliated with, endorsed by, or sponsored by
                Stripe. Stripe is a trademark of Stripe, Inc.
              </p>
            </TermsSection>

            <TermsSection title="Production readiness">
              <p className="text-sm leading-6 text-zinc-300">
                Production live-money use requires additional review,
                authentication readiness, RBAC review, restricted Stripe key
                setup, webhook reconciliation, audit export, privacy review,
                terms review, backup and rollback process, and explicit
                live-mode approval.
              </p>
              <ul className="mt-5 space-y-3">
                {readinessItems.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-amber-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </TermsSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-sm font-semibold text-zinc-50">Contact</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Contact RefundHold to discuss a controlled test-mode pilot.
            </p>
            <Link
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-emerald-300 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-200"
              href="/contact"
            >
              Contact RefundHold
            </Link>
            <div className="mt-6 border-t border-zinc-800 pt-5">
              <Link
                className="text-sm font-medium text-zinc-300 hover:text-zinc-50"
                href="/privacy"
              >
                Read privacy
              </Link>
            </div>
          </aside>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

function TermsSection({
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
