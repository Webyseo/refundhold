import Link from "next/link";

import { PublicFooter, PublicHeader } from "../public-header";
import { JsonLd } from "@/components/JsonLd";
import { createPublicPageMetadata, getPublicSeoPage, webPageJsonLd } from "@/lib/seo";

export const metadata = createPublicPageMetadata("/privacy");

const privacySeo = getPublicSeoPage("/privacy");

const processedData = [
  "refund proposal details",
  "refund amount and currency",
  "reason provided by an AI support agent",
  "policy result",
  "reviewer decision",
  "audit trail events",
  "timestamps where available",
  "contact details if someone emails RefundHold",
];

const demoLimits = [
  "no live Stripe secrets",
  "no unnecessary customer personal data",
  "no payment card data",
  "no sensitive financial records outside the refund review context",
  "no production live-money workflows in v1",
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <JsonLd
        data={webPageJsonLd({
          title: privacySeo.title,
          description: privacySeo.description,
          path: privacySeo.path,
          type: "Article",
        })}
      />
      <PublicHeader currentPath="/privacy" />
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold privacy
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Privacy
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            RefundHold is currently built for demo simulation and Stripe
            test-mode pilots. This page explains the current privacy boundary.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <PolicySection title="Current status">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold is in controlled pilot readiness. This privacy page
                is a plain-language placeholder and should be reviewed before
                production use.
              </p>
            </PolicySection>

            <PolicySection title="What RefundHold may process">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold may process operational data related to refund
                review, such as:
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                RefundHold may also record anonymous first-party activation
                events during public demo and quickstart use to understand
                whether the product flow is clear.
              </p>
              <ul className="mt-5 space-y-3">
                {processedData.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </PolicySection>

            <PolicySection title="What RefundHold should not receive in demo or test-mode">
              <ul className="space-y-3">
                {demoLimits.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-zinc-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </PolicySection>

            <PolicySection title="Stripe and test-mode">
              <p className="text-sm leading-6 text-zinc-300">
                Demo simulation does not call Stripe. Stripe test-mode uses
                Stripe test objects only. Live refunds are blocked in v1.
              </p>
            </PolicySection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-sm font-semibold text-zinc-50">Contact</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              For privacy questions or pilot requests, contact RefundHold.
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
                href="/terms"
              >
                Read terms
              </Link>
            </div>
          </aside>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}

function PolicySection({
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
