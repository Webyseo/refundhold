import Link from "next/link";

import { PublicHeader } from "../public-header";

const contactEmail = "hello@refundhold.com";

const pilotMailto = createMailto({
  subject: "RefundHold test-mode pilot",
  body: [
    "Product type:",
    "Stripe use case:",
    "AI agent status:",
    "Refund range to control:",
    "Preferred test mode: demo simulation or Stripe test-mode",
  ].join("\n"),
});

const clearFeedbackMailto = createMailto({
  subject: "RefundHold feedback: clear",
  body: "What was clear about RefundHold?",
});

const unclearFeedbackMailto = createMailto({
  subject: "RefundHold feedback: unclear",
  body: "What was confusing about RefundHold?",
});

const confusingFeedbackMailto = createMailto({
  subject: "RefundHold feedback: confusing part",
  body: "What was confusing?\n\nWhere did you get stuck?",
});

const detailsToSend = [
  "What kind of product you run",
  "How you use Stripe today",
  "Whether an AI support agent is already proposing refunds",
  "The refund amount range you want to control",
  "Whether you want demo simulation or Stripe test-mode first",
];

export default function ContactPage() {
  return (
    <main className="min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <PublicHeader />
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="max-w-3xl">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold contact
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            Contact RefundHold
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
            Testing AI-generated Stripe refunds? Tell us what you are trying to
            control.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <ContactSection title="Who this is for">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold is built for teams that want AI support agents to
                propose refunds without letting them move Stripe money without
                review.
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                It is for teams using Stripe and testing AI support agents that
                may propose refunds.
              </p>
            </ContactSection>

            <ContactSection title="What to send us">
              <ul className="space-y-3">
                {detailsToSend.map((item) => (
                  <li className="flex gap-3 text-sm text-zinc-300" key={item}>
                    <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-emerald-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </ContactSection>

            <ContactSection title="Was this clear?">
              <div className="flex flex-wrap gap-3">
                <a
                  className="inline-flex rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
                  href={clearFeedbackMailto}
                >
                  Yes
                </a>
                <a
                  className="inline-flex rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
                  href={unclearFeedbackMailto}
                >
                  No
                </a>
                <a
                  className="inline-flex rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900"
                  href={confusingFeedbackMailto}
                >
                  What was confusing?
                </a>
              </div>
            </ContactSection>

            <ContactSection title="Safety note">
              <p className="text-sm leading-6 text-zinc-300">
                RefundHold can run demo simulations and Stripe test-mode flows.
                Live refunds are blocked in v1.
              </p>
            </ContactSection>
          </div>

          <aside className="h-fit rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
            <p className="text-sm font-semibold text-zinc-50">Pilot request</p>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Send a short note about your Stripe refund flow and where human
              review should happen.
            </p>
            <a
              className="mt-5 inline-flex w-full items-center justify-center rounded-md bg-emerald-300 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-emerald-200"
              href={pilotMailto}
            >
              Request a test-mode pilot
            </a>
            <p className="mt-4 text-sm text-zinc-400">{contactEmail}</p>

            <div className="mt-6 border-t border-zinc-800 pt-5">
              <p className="text-sm font-semibold text-zinc-100">
                Keep exploring
              </p>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  className="text-sm font-medium text-zinc-300 hover:text-zinc-50"
                  href="/demo"
                >
                  Try public demo
                </Link>
                <Link
                  className="text-sm font-medium text-zinc-300 hover:text-zinc-50"
                  href="/docs/quickstart"
                >
                  Read quickstart
                </Link>
                <Link
                  className="text-sm font-medium text-zinc-300 hover:text-zinc-50"
                  href="/security"
                >
                  Read security and safety
                </Link>
                <Link
                  className="text-sm font-medium text-zinc-300 hover:text-zinc-50"
                  href="/privacy"
                >
                  Read privacy
                </Link>
                <Link
                  className="text-sm font-medium text-zinc-300 hover:text-zinc-50"
                  href="/terms"
                >
                  Read terms
                </Link>
              </div>
            </div>

            <p className="mt-6 border-t border-zinc-800 pt-5 text-xs leading-5 text-zinc-400">
              RefundHold is not affiliated with, endorsed by, or sponsored by
              Stripe. Stripe is a trademark of Stripe, Inc.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}

function ContactSection({
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

function createMailto({
  body,
  subject,
}: {
  body: string;
  subject: string;
}) {
  return `mailto:${contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
