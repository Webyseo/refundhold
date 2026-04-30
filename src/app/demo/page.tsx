"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { trackActivationEvent } from "../activation-event-client";
import { PublicHeader } from "../public-header";

type DemoStep = "proposal" | "policy" | "review" | "approved" | "rejected";

const statusItems = [
  "Demo simulation",
  "No Stripe call",
  "No real money moves",
  "Live refunds are blocked in v1",
];

const approvedAuditTrail = [
  "AI agent proposed the refund",
  "RefundHold matched your policy",
  "Human reviewer approved the request",
  "Demo execution recorded",
];

const rejectedAuditTrail = [
  "AI agent proposed the refund",
  "RefundHold matched your policy",
  "Human reviewer rejected the request",
  "Stripe execution was blocked",
];

export default function DemoPage() {
  const [step, setStep] = useState<DemoStep>("proposal");
  const auditViewedStep = useRef<DemoStep | null>(null);

  const isFinalStep = step === "approved" || step === "rejected";

  useEffect(() => {
    if (!isFinalStep || auditViewedStep.current === step) {
      return;
    }

    auditViewedStep.current = step;
    trackActivationEvent("demo_audit_viewed", {
      route: "/demo",
      step: "audit",
      outcome: step,
    });
  }, [isFinalStep, step]);

  const actions = {
    startDemo() {
      trackActivationEvent("demo_started", {
        route: "/demo",
        step: "proposal",
      });
      trackActivationEvent("demo_policy_matched", {
        route: "/demo",
        step: "policy",
        outcome: "needs_review",
      });
      setStep("policy");
    },
    reviewRefund() {
      trackActivationEvent("demo_review_opened", {
        route: "/demo",
        step: "review",
      });
      setStep("review");
    },
    approveRefund() {
      trackActivationEvent("demo_refund_approved", {
        route: "/demo",
        step: "decision",
        outcome: "approved",
      });
      setStep("approved");
    },
    rejectRefund() {
      trackActivationEvent("demo_refund_rejected", {
        route: "/demo",
        step: "decision",
        outcome: "rejected",
      });
      setStep("rejected");
    },
  };

  return (
    <main className="min-h-screen overflow-x-clip bg-zinc-950 text-zinc-50">
      <PublicHeader />
      <section className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl gap-8 px-6 py-12 lg:grid-cols-[1fr_22rem] lg:items-center">
        <div>
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
            RefundHold demo
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
            See RefundHold stop a risky AI refund before it reaches Stripe
          </h1>
          <div className="mt-6 max-w-2xl space-y-3 text-lg leading-8 text-zinc-300">
            <p>
              An AI support agent proposes a $420 refund. RefundHold checks your
              rules, holds it for human review, and records the decision.
            </p>
            <p>No login. No real Stripe money. Demo only.</p>
          </div>

          <div className="mt-10 rounded-lg border border-zinc-800 bg-zinc-900/70 p-5 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-3 border-b border-zinc-800 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.16em] text-zinc-400">
                  Demo refund
                </p>
                <p className="mt-2 text-xl font-semibold text-zinc-50">
                  $420 Stripe refund
                </p>
              </div>
              <p className="w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-sm font-medium text-amber-200">
                Held until approved
              </p>
            </div>

            <div aria-live="polite" className="mt-6" role="status">
              {renderDemoStep(step, actions)}
            </div>
          </div>

          {isFinalStep ? (
            <div className="mt-8">
              <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
                <Link
                  className="inline-flex items-center justify-center rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
                  href="/docs/quickstart"
                >
                  See 5-minute setup
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
                  href="/demo/reviewer"
                >
                  Open reviewer dashboard
                </Link>
              </div>
              <Link
                className="mt-4 inline-flex text-sm font-medium text-zinc-400 hover:text-zinc-100"
                href="/contact"
              >
                Was this clear?
              </Link>
            </div>
          ) : null}
        </div>

        <aside className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-5">
          <p className="text-sm font-semibold text-zinc-100">Safety status</p>
          <div className="mt-4 space-y-3">
            {statusItems.map((item) => (
              <div className="flex items-center gap-3" key={item}>
                <span className="h-2 w-2 rounded-full bg-emerald-300" />
                <p className="text-sm text-zinc-300">{item}</p>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}

function renderDemoStep(
  step: DemoStep,
  actions: {
    approveRefund: () => void;
    rejectRefund: () => void;
    reviewRefund: () => void;
    startDemo: () => void;
  },
): React.ReactNode {
  if (step === "proposal") {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-zinc-50">
          AI agent wants to refund $420
        </h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Reason" value="Customer says they were double charged" />
          <Detail label="Source" value="AI support agent" />
          <Detail label="Destination" value="Stripe refund" />
        </dl>
        <button
          className="mt-8 inline-flex items-center justify-center rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
          onClick={actions.startDemo}
          type="button"
        >
          Start demo refund
        </button>
      </div>
    );
  }

  if (step === "policy") {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-zinc-50">
          RefundHold policy check
        </h2>
        <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
          <p className="text-sm font-medium text-zinc-400">Rule matched</p>
          <p className="mt-2 text-lg font-semibold text-zinc-50">
            $50–$500 → human approval required
          </p>
        </div>
        <p className="mt-5 text-base font-medium text-amber-200">
          This refund is held for review.
        </p>
        <button
          className="mt-8 inline-flex items-center justify-center rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
          onClick={actions.reviewRefund}
          type="button"
        >
          Review refund
        </button>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div>
        <h2 className="text-2xl font-semibold text-zinc-50">Refund request</h2>
        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <Detail label="Amount" value="$420" />
          <Detail label="Risk" value="Medium" />
          <Detail label="Policy" value="Human approval required" />
          <Detail
            label="Reason"
            value="AI support agent recommended a refund"
          />
        </dl>
        <p className="mt-6 text-base font-medium text-zinc-100">
          Approve or reject this refund before it can continue.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            className="inline-flex items-center justify-center rounded-md bg-emerald-300 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
            onClick={actions.approveRefund}
            type="button"
          >
            Approve refund
          </button>
          <button
            className="inline-flex items-center justify-center rounded-md border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
            onClick={actions.rejectRefund}
            type="button"
          >
            Reject refund
          </button>
        </div>
      </div>
    );
  }

  return (
    <AuditResult
      auditTrail={step === "approved" ? approvedAuditTrail : rejectedAuditTrail}
      title={step === "approved" ? "Refund approved" : "Refund rejected"}
    />
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
      <dt className="text-sm font-medium text-zinc-400">{label}</dt>
      <dd className="mt-2 text-base font-semibold text-zinc-50">{value}</dd>
    </div>
  );
}

function AuditResult({
  auditTrail,
  title,
}: {
  auditTrail: string[];
  title: string;
}) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-zinc-50">{title}</h2>
      <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4">
        <p className="text-sm font-medium text-zinc-400">Audit trail</p>
        <ol className="mt-4 space-y-3">
          {auditTrail.map((item, index) => (
            <li className="flex gap-3 text-sm text-zinc-200" key={item}>
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-300 text-xs font-semibold text-zinc-950">
                {index + 1}
              </span>
              <span className="pt-0.5">{item}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-5 text-base font-medium text-zinc-100">
        No real money moved in this demo.
      </p>
    </div>
  );
}
