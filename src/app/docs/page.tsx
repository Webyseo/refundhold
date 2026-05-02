import Link from "next/link";

import { PublicHeader } from "../public-header";

const groups = [
  {
    title: "Start",
    links: [
      ["Quickstart", "/docs/quickstart"],
      ["API reference", "/docs/api"],
      ["Exact test-mode runbook", "/docs/test-mode-runbook"],
    ],
  },
  {
    title: "Pilot",
    links: [
      ["Test-mode pilot contract", "/docs/test-mode-pilot"],
      ["Pilot acceptance contract", "/docs/pilot-acceptance"],
      ["Stripe test-mode setup", "/docs/stripe-test-mode"],
    ],
  },
  {
    title: "Security",
    links: [
      ["Prevent bypass", "/docs/prevent-bypass"],
      ["Security boundary", "/security"],
      ["Privacy", "/privacy"],
      ["Terms", "/terms"],
    ],
  },
  {
    title: "Demo",
    links: [
      ["Public demo", "/demo"],
      ["Reviewer dashboard demo", "/demo/reviewer"],
    ],
  },
];

export default function DocsIndexPage() {
  return (
    <main className="docs-page min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <PublicHeader />
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="max-w-4xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold docs
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            RefundHold docs
          </h1>
          <p className="mt-6 text-lg leading-8 text-zinc-300">
            Start with the demo, then use the API, test-mode runbook, and pilot
            contracts to evaluate a controlled Stripe test-mode pilot.
          </p>
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {groups.map((group) => (
            <section
              className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5"
              key={group.title}
            >
              <h2 className="text-xl font-semibold text-zinc-50">
                {group.title}
              </h2>
              <div className="mt-5 grid gap-3">
                {group.links.map(([label, href]) => (
                  <Link
                    className="inline-flex min-h-11 items-center justify-between gap-3 rounded-md border border-zinc-800 px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                    href={href}
                    key={href}
                  >
                    <span>{label}</span>
                    <span aria-hidden="true" className="text-emerald-300">
                      -&gt;
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
