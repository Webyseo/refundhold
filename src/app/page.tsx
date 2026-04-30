import Link from "next/link";

import {
  ActivationEventLink,
  ActivationEventView,
} from "./activation-event-client";

export default function Home() {
  const steps = [
    "AI agent proposes refund",
    "RefundHold checks policy",
    "Risky refund waits for approval",
    "Human approves or rejects",
    "Audit trail is recorded",
  ];

  const values = [
    {
      title: "Check refund risk",
      description: "Apply simple refund rules before Stripe execution.",
    },
    {
      title: "Hold risky refunds",
      description: "Require human approval for refunds above your threshold.",
    },
    {
      title: "Record every decision",
      description:
        "Keep an audit trail of the proposal, policy, reviewer and outcome.",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-50">
      <ActivationEventView
        eventName="landing_viewed"
        metadata={{
          route: "/",
        }}
      />
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-5xl flex-col justify-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
          RefundHold
        </p>
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
          Stop AI agents from refunding Stripe money without approval
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          RefundHold sits between your AI support agent and Stripe. It checks
          each refund, holds risky ones for human review, and records every
          decision.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:flex-wrap">
          <ActivationEventLink
            className="inline-flex items-center justify-center rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
            eventName="landing_demo_cta_clicked"
            href="/demo"
            metadata={{
              route: "/",
              outcome: "open_public_demo",
            }}
          >
            Try the refund demo
          </ActivationEventLink>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
            href="/docs/quickstart"
          >
            View 5-minute setup
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-50"
            href="/contact"
          >
            Contact
          </Link>
          <Link
            className="inline-flex items-center justify-center rounded-md border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-zinc-600 hover:bg-zinc-900 hover:text-zinc-50"
            href="/security"
          >
            Security
          </Link>
        </div>
        <p className="mt-4 text-sm text-zinc-400">
          Demo mode only. No live Stripe money moves.
        </p>
        <Link
          className="mt-3 inline-flex text-sm font-medium text-zinc-300 hover:text-zinc-50"
          href="/demo/reviewer"
        >
          View reviewer dashboard demo
        </Link>
        <nav className="mt-4 flex flex-wrap gap-4 text-sm font-medium text-zinc-500">
          <Link className="hover:text-zinc-200" href="/privacy">
            Privacy
          </Link>
          <Link className="hover:text-zinc-200" href="/terms">
            Terms
          </Link>
        </nav>

        <div className="mt-14 grid gap-4 lg:grid-cols-5">
          {steps.map((step, index) => (
            <div
              className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4"
              key={step}
            >
              <p className="text-sm font-semibold text-emerald-300">
                {index + 1}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-100">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {values.map((value) => (
            <section
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-5"
              key={value.title}
            >
              <h2 className="text-base font-semibold text-zinc-50">
                {value.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                {value.description}
              </p>
            </section>
          ))}
        </div>
      </section>
    </main>
  );
}
