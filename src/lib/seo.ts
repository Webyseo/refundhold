import type { Metadata } from "next";

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://refundhold.com";
export const SITE_NAME = "RefundHold";
export const DEFAULT_OG_IMAGE = new URL("/opengraph-image", SITE_URL).toString();
export const DEFAULT_METADATA_TITLE =
  "RefundHold – AI Approval Inbox for Stripe Refunds";
export const DEFAULT_METADATA_DESCRIPTION =
  "Stop AI agents from refunding Stripe money without approval. RefundHold checks AI-proposed Stripe refunds, holds risky ones for review, and records every decision.";

export const publicRobots = {
  index: true,
  follow: true,
} satisfies NonNullable<Metadata["robots"]>;

export const noindexRobots = {
  index: false,
  follow: false,
} satisfies NonNullable<Metadata["robots"]>;

export type SeoPage = {
  path: string;
  title: string;
  description: string;
  priority: number;
  changeFrequency?: "weekly" | "monthly";
};

export const PUBLIC_INDEXABLE_PAGES: SeoPage[] = [
  {
    path: "/",
    title: DEFAULT_METADATA_TITLE,
    description: DEFAULT_METADATA_DESCRIPTION,
    priority: 1,
    changeFrequency: "weekly",
  },
  {
    path: "/demo",
    title: "RefundHold Demo – Stop a Risky AI Refund",
    description:
      "Try a no-login demo: an AI support agent proposes a $420 Stripe refund, RefundHold holds it for human review, and an audit trail is recorded.",
    priority: 0.9,
    changeFrequency: "weekly",
  },
  {
    path: "/demo/reviewer",
    title: "Reviewer Demo – Review AI-Proposed Stripe Refunds",
    description:
      "Explore the reviewer dashboard for AI-proposed Stripe refunds. Approve or reject risky requests before they continue. Sample data only; no real money moves.",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: "/docs",
    title: "RefundHold Docs – API, Quickstart, and Stripe Test Mode",
    description:
      "Read the RefundHold quickstart, API reference, Stripe test-mode setup, security limits, and demo guides for AI-proposed Stripe refund approvals.",
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    path: "/docs/quickstart",
    title: "RefundHold Quickstart – 5-Minute Setup for AI Refund Approval",
    description:
      "Integrate RefundHold in minutes. Send an AI-proposed Stripe refund request, apply the demo policy, hold risky refunds, and view the audit trail.",
    priority: 0.8,
    changeFrequency: "weekly",
  },
  {
    path: "/docs/api",
    title: "RefundHold API Reference – AI-Proposed Stripe Refund Requests",
    description:
      "Use the RefundHold API to send AI-proposed Stripe refund requests, receive policy decisions, route risky refunds to review, and record outcomes.",
    priority: 0.7,
    changeFrequency: "weekly",
  },
  {
    path: "/docs/stripe-test-mode",
    title: "Stripe Test-Mode Setup for RefundHold",
    description:
      "Configure RefundHold safely with Stripe test-mode. Use test objects only, verify webhook behavior, and keep live refunds blocked in v1.",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/prevent-bypass",
    title: "Prevent Stripe Refund Bypass | RefundHold",
    description:
      "Learn how to keep AI support agents from bypassing RefundHold when proposing Stripe refunds for human approval.",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/test-mode-runbook",
    title: "RefundHold Test-Mode Runbook",
    description:
      "Follow the RefundHold runbook for a controlled Stripe test-mode pilot with demo simulations, test objects, and live refunds blocked.",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/test-mode-pilot",
    title: "RefundHold Test-Mode Pilot Contract",
    description:
      "Review the RefundHold pilot contract for evaluating AI-proposed Stripe refund approvals in demo simulation and Stripe test-mode.",
    priority: 0.5,
    changeFrequency: "monthly",
  },
  {
    path: "/docs/pilot-acceptance",
    title: "RefundHold Pilot Acceptance Contract",
    description:
      "Use the RefundHold acceptance contract to verify policy checks, human review, audit trails, and blocked live refunds during a test-mode pilot.",
    priority: 0.5,
    changeFrequency: "monthly",
  },
  {
    path: "/security",
    title: "RefundHold Security – Approval Controls for AI Stripe Refunds",
    description:
      "Learn RefundHold's safety boundary: demo simulations, Stripe test-mode flows, human approval, audit trails, and live refunds blocked in v1.",
    priority: 0.7,
    changeFrequency: "monthly",
  },
  {
    path: "/contact",
    title: "Contact RefundHold – Request a Test-Mode Pilot",
    description:
      "Contact RefundHold to discuss AI-generated Stripe refund approvals, request a controlled test-mode pilot, or send product feedback.",
    priority: 0.6,
    changeFrequency: "monthly",
  },
  {
    path: "/privacy",
    title: "Privacy Policy | RefundHold",
    description:
      "Read how RefundHold handles refund review data, audit events, activation analytics, and contact details during demo simulations and test-mode pilots.",
    priority: 0.3,
    changeFrequency: "monthly",
  },
  {
    path: "/terms",
    title: "Terms of Use | RefundHold",
    description:
      "Read the current RefundHold terms for demo simulation and controlled Stripe test-mode pilots. Live refunds remain blocked in v1.",
    priority: 0.3,
    changeFrequency: "monthly",
  },
];

export const PRIVATE_NOINDEX_ROUTES = [
  "/app",
  "/app/refund-requests",
  "/app/refund-requests/[id]",
  "/app/action-requests",
  "/app/action-requests/[id]",
  "/app/onboarding",
  "/app/stripe",
  "/demo-access",
  "/login",
];

export const rootMetadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: DEFAULT_METADATA_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DEFAULT_METADATA_DESCRIPTION,
  robots: publicRobots,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    title: DEFAULT_METADATA_TITLE,
    description: DEFAULT_METADATA_DESCRIPTION,
    url: absoluteUrl("/"),
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: "RefundHold social preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_METADATA_TITLE,
    description: DEFAULT_METADATA_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE],
  },
} satisfies Metadata;

export function absoluteUrl(path: string): string {
  return new URL(path, SITE_URL).toString();
}

export function getPublicSeoPage(path: string): SeoPage {
  const page = PUBLIC_INDEXABLE_PAGES.find((item) => item.path === path);

  if (!page) {
    throw new Error(`Missing SEO config for public path: ${path}`);
  }

  return page;
}

export function createPublicPageMetadata(path: string): Metadata {
  return createPageMetadata(getPublicSeoPage(path));
}

export function createPageMetadata({
  description,
  path,
  title,
}: Pick<SeoPage, "description" | "path" | "title">): Metadata {
  const url = absoluteUrl(path);

  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: url,
    },
    robots: publicRobots,
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type: "website",
      locale: "en_US",
      images: [
        {
          url: DEFAULT_OG_IMAGE,
          width: 1200,
          height: 630,
          alt: "RefundHold social preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export function createNoindexMetadata({
  description,
  path,
  title,
}: {
  description: string;
  path: string;
  title: string;
}): Metadata {
  return {
    title: {
      absolute: title,
    },
    description,
    alternates: {
      canonical: absoluteUrl(path),
    },
    robots: noindexRobots,
  };
}

export function organizationJsonLd() {
  return {
    "@type": "Organization",
    "@id": `${absoluteUrl("/")}#organization`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
  };
}

export function websiteJsonLd() {
  return {
    "@type": "WebSite",
    "@id": `${absoluteUrl("/")}#website`,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    publisher: {
      "@id": `${absoluteUrl("/")}#organization`,
    },
  };
}

export function softwareApplicationJsonLd() {
  return {
    "@type": "SoftwareApplication",
    "@id": `${absoluteUrl("/")}#software`,
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: DEFAULT_METADATA_DESCRIPTION,
    url: absoluteUrl("/"),
    publisher: {
      "@id": `${absoluteUrl("/")}#organization`,
    },
  };
}

export function graphJsonLd(items: Array<Record<string, unknown>>) {
  return {
    "@context": "https://schema.org",
    "@graph": items,
  };
}

export function webPageJsonLd({
  description,
  path,
  title,
  type = "WebPage",
}: {
  description: string;
  path: string;
  title: string;
  type?: "WebPage" | "CollectionPage" | "Article" | "TechArticle" | "ContactPage";
}) {
  return {
    "@context": "https://schema.org",
    "@type": type,
    name: title,
    headline: title,
    description,
    url: absoluteUrl(path),
    inLanguage: "en-US",
    publisher: organizationJsonLd(),
  };
}

export function howToJsonLd({
  description,
  path,
  steps,
  title,
}: {
  description: string;
  path: string;
  steps: string[];
  title: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: title,
    description,
    url: absoluteUrl(path),
    inLanguage: "en-US",
    step: steps.map((name, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name,
      text: name,
    })),
  };
}

export function faqPageJsonLd({
  items,
}: {
  items: Array<{ answer: string; question: string }>;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
