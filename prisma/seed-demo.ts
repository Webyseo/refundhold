import "dotenv/config";

import { pathToFileURL } from "node:url";

import { PrismaPg } from "@prisma/adapter-pg";

import {
  extractDemoApiKeyPrefix,
  hashApiKey,
  readConfiguredDemoAgentApiKey,
} from "../src/lib/security/api-keys";

const demoOrganization = {
  name: "RefundHold Demo",
  slug: "authrail-demo",
};

const demoAgent = {
  name: "RefundHold Demo AI Support Agent",
  description:
    "Fictitious support agent used for RefundHold commercial demos.",
};

const demoApiKeyName = "Demo Support Agent API Key";

const demoConnector = {
  name: "Stripe Demo (dry_run)",
  type: "stripe_test",
};

type PrismaClientConstructor = new (options: {
  adapter: PrismaPg;
}) => DemoPrismaClient;

type UpsertDelegate = {
  upsert: (args: unknown) => Promise<{ id: string }>;
};

type AgentApiKeyDelegate = {
  findFirst: (
    args: unknown,
  ) => Promise<{ id: string; keyPrefix: string } | null>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
};

type DemoPrismaClient = {
  organization: UpsertDelegate;
  authUser: UpsertDelegate;
  user: UpsertDelegate;
  membership: UpsertDelegate;
  agent: UpsertDelegate;
  agentApiKey: AgentApiKeyDelegate;
  connector: UpsertDelegate;
  policy: UpsertDelegate;
  actionRequest: UpsertDelegate & {
    deleteMany: (args: unknown) => Promise<{ count: number }>;
  };
  approval: UpsertDelegate;
  execution: UpsertDelegate;
  auditEvent: UpsertDelegate;
  stripePaymentObject: UpsertDelegate;
  $disconnect: () => Promise<void>;
};

type DemoPolicyKey =
  | "lowRiskAllow"
  | "standardReview"
  | "highRiskReview"
  | "policyDeny";

type DemoApproval = {
  status: "PENDING" | "APPROVED" | "REJECTED";
  reason: string | null;
  reviewedMinutesAfterCreate?: number;
  expiresMinutesAfterCreate?: number;
};

type DemoExecution = {
  status: "SUCCEEDED" | "FAILED";
  startedMinutesAfterCreate: number;
  completedMinutesAfterCreate: number;
};

type DemoRefundMode = "demo_simulation" | "stripe_test_mode";

type DemoRefundRequest = {
  id: string;
  ageMinutes: number;
  mode: DemoRefundMode;
  policyKey: DemoPolicyKey;
  status:
    | "ALLOWED"
    | "DENIED"
    | "APPROVAL_REQUIRED"
    | "APPROVED"
    | "REJECTED"
    | "EXECUTED"
    | "FAILED";
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED";
  amount: number;
  currency: string;
  refundReason: string;
  riskReason: string;
  idempotencyKey: string;
  livemode: false;
  webhookStatus?: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  order: {
    id: string;
    summary: string;
  };
  paymentIntentId: string;
  chargeId: string;
  riskScore: number;
  riskLabel: string;
  customerMessage: string;
  policyReason: string;
  approval?: DemoApproval;
  execution?: DemoExecution;
};

const policyDefinitions = [
  {
    key: "lowRiskAllow",
    name: "Allow low-risk dry_run refunds under 50 USD",
    description:
      "Demo policy: low-value fictitious Stripe refunds can be allowed automatically.",
    decision: "ALLOW",
    priority: 10,
    rules: {
      connector: "stripe_test",
      action: "refund.create",
      amount_lt: 50,
    },
  },
  {
    key: "standardReview",
    name: "Review standard dry_run refunds from 50 USD to 250 USD",
    description:
      "Demo policy: standard AI-initiated refunds require human approval.",
    decision: "APPROVAL_REQUIRED",
    priority: 20,
    rules: {
      connector: "stripe_test",
      action: "refund.create",
      amount_gte: 50,
      amount_lte: 250,
    },
  },
  {
    key: "highRiskReview",
    name: "Review elevated-risk dry_run refunds from 250 USD to 500 USD",
    description:
      "Demo policy: higher-risk AI-initiated refunds are held for review.",
    decision: "APPROVAL_REQUIRED",
    priority: 30,
    rules: {
      connector: "stripe_test",
      action: "refund.create",
      amount_gt: 250,
      amount_lte: 500,
    },
  },
  {
    key: "policyDeny",
    name: "Deny dry_run refunds over 500 USD",
    description:
      "Demo policy: very high-value AI-initiated refunds are blocked.",
    decision: "DENY",
    priority: 40,
    rules: {
      connector: "stripe_test",
      action: "refund.create",
      amount_gt: 500,
    },
  },
] satisfies {
  key: DemoPolicyKey;
  name: string;
  description: string;
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED";
  priority: number;
  rules: Record<string, string | number>;
}[];

export const demoRefundRequests = [
  {
    id: "demo-refund-420-review",
    ageMinutes: 18,
    mode: "demo_simulation",
    policyKey: "highRiskReview",
    status: "APPROVAL_REQUIRED",
    decision: "APPROVAL_REQUIRED",
    amount: 420,
    currency: "usd",
    refundReason: "possible duplicate billing",
    riskReason: "Medium risk: customer reports a possible duplicate charge.",
    idempotencyKey: "demo-refund-420-proposal",
    livemode: false,
    customer: {
      id: "cus_demo_customer_042",
      name: "Demo Customer 042",
      email: "customer-042@example.test",
    },
    order: {
      id: "RH-DEMO-420",
      summary: "Possible duplicate billing on annual support package",
    },
    paymentIntentId: "pi_demo_refundhold_420_review",
    chargeId: "ch_demo_refundhold_420_review",
    riskScore: 62,
    riskLabel: "medium",
    customerMessage:
      "Customer reports a duplicate charge and asks for a refund.",
    policyReason:
      "$50-$500 -> human approval required: possible duplicate billing requires reviewer confirmation.",
    approval: {
      status: "PENDING",
      reason: "Awaiting reviewer decision for possible duplicate billing.",
      expiresMinutesAfterCreate: 480,
    },
  },
  {
    id: "demo-refund-100-approved-test",
    ageMinutes: 46,
    mode: "stripe_test_mode",
    policyKey: "standardReview",
    status: "APPROVED",
    decision: "APPROVAL_REQUIRED",
    amount: 100,
    currency: "usd",
    refundReason: "damaged item evidence",
    riskReason: "Medium risk: refund is supported by damaged item evidence.",
    idempotencyKey: "demo-refund-100-approved-test",
    livemode: false,
    customer: {
      id: "cus_demo_damaged_item",
      name: "Damaged Item Customer",
      email: "damaged-item@example.test",
    },
    order: {
      id: "RH-DEMO-100",
      summary: "Damaged item replacement order",
    },
    paymentIntentId: "pi_demo_refundhold_100_approved",
    chargeId: "ch_demo_refundhold_100_approved",
    riskScore: 44,
    riskLabel: "medium",
    customerMessage:
      "AI support agent found damaged item evidence and recommended a refund.",
    policyReason:
      "$50-$500 -> human approval required: damaged item evidence needs reviewer approval.",
    approval: {
      status: "APPROVED",
      reason: "Approved because the damaged item evidence supports the refund.",
      reviewedMinutesAfterCreate: 9,
    },
  },
  {
    id: "demo-refund-275-rejected",
    ageMinutes: 73,
    mode: "demo_simulation",
    policyKey: "highRiskReview",
    status: "REJECTED",
    decision: "APPROVAL_REQUIRED",
    amount: 275,
    currency: "usd",
    refundReason: "AI recommendation incomplete",
    riskReason: "Medium risk: the AI recommendation is incomplete.",
    idempotencyKey: "demo-refund-275-rejected",
    livemode: false,
    customer: {
      id: "cus_demo_incomplete_reason",
      name: "Incomplete Reason Customer",
      email: "incomplete-reason@example.test",
    },
    order: {
      id: "RH-DEMO-275",
      summary: "Refund request with incomplete support notes",
    },
    paymentIntentId: "pi_demo_refundhold_275_rejected",
    chargeId: "ch_demo_refundhold_275_rejected",
    riskScore: 58,
    riskLabel: "medium",
    customerMessage:
      "AI support agent recommended a refund but did not provide enough evidence.",
    policyReason:
      "$50-$500 -> human approval required: reviewer must confirm evidence before refunding.",
    approval: {
      status: "REJECTED",
      reason: "Rejected because the AI recommendation was incomplete.",
      reviewedMinutesAfterCreate: 10,
    },
  },
  {
    id: "demo-refund-035-executed",
    ageMinutes: 121,
    mode: "demo_simulation",
    policyKey: "lowRiskAllow",
    status: "EXECUTED",
    decision: "ALLOW",
    amount: 35,
    currency: "usd",
    refundReason: "low-value goodwill refund",
    riskReason: "Low risk: small goodwill refund is inside policy.",
    idempotencyKey: "demo-refund-035-executed",
    livemode: false,
    customer: {
      id: "cus_demo_low_value_refund",
      name: "Low Value Refund Customer",
      email: "low-value-refund@example.test",
    },
    order: {
      id: "RH-DEMO-035",
      summary: "Low-value goodwill refund",
    },
    paymentIntentId: "pi_demo_refundhold_035_executed",
    chargeId: "ch_demo_refundhold_035_executed",
    riskScore: 14,
    riskLabel: "low",
    customerMessage:
      "AI support agent recommended a low-value goodwill refund.",
    policyReason:
      "under $50 -> allowed by policy: low-value goodwill refund can be recorded as demo execution.",
    execution: {
      status: "SUCCEEDED",
      startedMinutesAfterCreate: 4,
      completedMinutesAfterCreate: 5,
    },
  },
  {
    id: "demo-refund-850-blocked",
    ageMinutes: 8,
    mode: "demo_simulation",
    policyKey: "policyDeny",
    status: "DENIED",
    decision: "DENY",
    amount: 850,
    currency: "usd",
    refundReason: "refund exceeds policy limit",
    riskReason: "High risk: requested refund is above the policy limit.",
    idempotencyKey: "demo-refund-850-blocked",
    livemode: false,
    customer: {
      id: "cus_demo_high_value_refund",
      name: "High Value Refund Customer",
      email: "high-value-refund@example.test",
    },
    order: {
      id: "RH-DEMO-850",
      summary: "High-value refund above demo policy limit",
    },
    paymentIntentId: "pi_demo_refundhold_850_blocked",
    chargeId: "ch_demo_refundhold_850_blocked",
    riskScore: 94,
    riskLabel: "high",
    customerMessage:
      "AI support agent requested a high-value refund that exceeds policy.",
    policyReason:
      "over $500 -> blocked by policy: refund exceeds the configured limit.",
  },
  {
    id: "demo-refund-120-needs-attention",
    ageMinutes: 31,
    mode: "stripe_test_mode",
    policyKey: "standardReview",
    status: "FAILED",
    decision: "APPROVAL_REQUIRED",
    amount: 120,
    currency: "usd",
    refundReason: "pending Stripe test webhook reconciliation",
    riskReason:
      "Medium risk: Stripe test webhook reconciliation is missing or pending.",
    idempotencyKey: "demo-refund-120-webhook-pending",
    livemode: false,
    webhookStatus: "pending Stripe test webhook reconciliation",
    customer: {
      id: "cus_demo_webhook_pending",
      name: "Webhook Pending Customer",
      email: "webhook-pending@example.test",
    },
    order: {
      id: "RH-DEMO-120",
      summary: "Stripe test refund waiting for webhook reconciliation",
    },
    paymentIntentId: "pi_demo_refundhold_120_attention",
    chargeId: "ch_demo_refundhold_120_attention",
    riskScore: 67,
    riskLabel: "medium",
    customerMessage:
      "AI support agent recommended a refund, but the Stripe test webhook is pending.",
    policyReason:
      "$50-$500 -> human approval required: test-mode reconciliation needs attention.",
    approval: {
      status: "APPROVED",
      reason: "Approved for Stripe test-mode rehearsal; webhook is still pending.",
      reviewedMinutesAfterCreate: 7,
    },
    execution: {
      status: "FAILED",
      startedMinutesAfterCreate: 9,
      completedMinutesAfterCreate: 11,
    },
  },
  {
    id: "demo-refund-480-approved-waiting",
    ageMinutes: 57,
    mode: "stripe_test_mode",
    policyKey: "highRiskReview",
    status: "APPROVED",
    decision: "APPROVAL_REQUIRED",
    amount: 480,
    currency: "usd",
    refundReason: "duplicate annual plan charge",
    riskReason:
      "Medium risk: duplicate annual plan charge needs reviewer approval.",
    idempotencyKey: "demo-refund-480-approved-waiting",
    livemode: false,
    customer: {
      id: "cus_demo_approved_waiting",
      name: "Approved Waiting Customer",
      email: "approved-waiting@example.test",
    },
    order: {
      id: "RH-DEMO-480",
      summary: "Duplicate annual plan charge",
    },
    paymentIntentId: "pi_demo_refundhold_480_waiting",
    chargeId: "ch_demo_refundhold_480_waiting",
    riskScore: 63,
    riskLabel: "medium",
    customerMessage:
      "AI support agent found a duplicate annual plan charge and recommended review.",
    policyReason:
      "$50-$500 -> human approval required: duplicate annual plan charge approved by reviewer.",
    approval: {
      status: "APPROVED",
      reason: "Approved; waiting for controlled Stripe test-mode execution.",
      reviewedMinutesAfterCreate: 12,
    },
  },
  {
    id: "demo-refund-018-allowed",
    ageMinutes: 157,
    mode: "demo_simulation",
    policyKey: "lowRiskAllow",
    status: "ALLOWED",
    decision: "ALLOW",
    amount: 18,
    currency: "usd",
    refundReason: "small support credit",
    riskReason: "Low risk: small support credit is under the policy threshold.",
    idempotencyKey: "demo-refund-018-allowed",
    livemode: false,
    customer: {
      id: "cus_demo_small_credit",
      name: "Small Credit Customer",
      email: "small-credit@example.test",
    },
    order: {
      id: "RH-DEMO-018",
      summary: "Small support credit",
    },
    paymentIntentId: "pi_demo_refundhold_018_allowed",
    chargeId: "ch_demo_refundhold_018_allowed",
    riskScore: 8,
    riskLabel: "low",
    customerMessage:
      "AI support agent found a small support credit within refund policy.",
    policyReason:
      "under $50 -> allowed by policy: small support credit can continue.",
  },
] satisfies DemoRefundRequest[];

export const curatedDemoRefundRequestIds = demoRefundRequests.map(
  (request) => request.id,
);

async function main() {
  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    console.error("DATABASE_URL is required to run the RefundHold demo seed.");
    process.exit(1);
  }

  const prisma = await createPrismaClient(databaseUrl);

  try {
    const reviewerEmail =
      process.env["AUTHRAIL_DEMO_REVIEWER_EMAIL"]?.trim() ||
      "demo.reviewer@refundhold.com";
    const baseRecords = await upsertBaseDemoRecords(prisma, reviewerEmail);
    const demoApiKey = await ensureDemoAgentApiKey(prisma, {
      organizationId: baseRecords.organization.id,
      agentId: baseRecords.agent.id,
    });
    const policyIds = await upsertDemoPolicies(prisma, {
      organizationId: baseRecords.organization.id,
      connectorId: baseRecords.connector.id,
    });
    const cleanup = await cleanupLegacySeededDemoRefundRequests(prisma, {
      organizationId: baseRecords.organization.id,
      agentId: baseRecords.agent.id,
      connectorId: baseRecords.connector.id,
    });

    for (const refundRequest of demoRefundRequests) {
      await upsertDemoRefundRequest(prisma, {
        refundRequest,
        organizationId: baseRecords.organization.id,
        reviewerId: baseRecords.reviewer.id,
        agentId: baseRecords.agent.id,
        connectorId: baseRecords.connector.id,
        policyId: getPolicyId(policyIds, refundRequest.policyKey),
      });
    }

    console.log(
      `RefundHold demo seed complete: ${demoRefundRequests.length} curated fake refund requests are available.`,
    );
    console.log(
      `Scoped demo cleanup removed ${cleanup.count} legacy seeded refund requests.`,
    );

    if (demoApiKey.source === "configured") {
      console.log(`Demo agent API key configured from ${demoApiKey.envName}.`);
    } else if (demoApiKey.source === "existing") {
      console.log("Demo agent API key already exists; raw key was not shown.");
    } else {
      console.log(
        "No demo agent API key configured. Set REFUNDHOLD_DEMO_AGENT_API_KEY and rerun pnpm db:seed:demo before calling /api/v1/refund-requests.",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function createPrismaClient(
  databaseUrl: string,
): Promise<DemoPrismaClient> {
  const generatedClientPath = "../src/generated/prisma/client";
  const { PrismaClient } = (await import(generatedClientPath)) as {
    PrismaClient: PrismaClientConstructor;
  };
  const adapter = new PrismaPg({ connectionString: databaseUrl });

  return new PrismaClient({ adapter });
}

async function upsertBaseDemoRecords(
  prisma: DemoPrismaClient,
  reviewerEmail: string,
) {
  const organization = await prisma.organization.upsert({
    where: {
      slug: demoOrganization.slug,
    },
    update: {
      name: demoOrganization.name,
    },
    create: demoOrganization,
  });

  const authUser = await upsertDemoAuthUser(prisma, {
    email: reviewerEmail,
    name: "RefundHold Demo Reviewer",
  });

  const reviewer = await prisma.user.upsert({
    where: {
      organizationId_email: {
        organizationId: organization.id,
        email: reviewerEmail,
      },
    },
    update: {
      authUserId: authUser.id,
      displayName: "RefundHold Demo Reviewer",
      status: "ACTIVE",
    },
    create: {
      organizationId: organization.id,
      authUserId: authUser.id,
      email: reviewerEmail,
      displayName: "RefundHold Demo Reviewer",
      status: "ACTIVE",
    },
  });
  await ensureDemoReviewerMembership(prisma, {
    organizationId: organization.id,
    userId: reviewer.id,
    authUserId: authUser.id,
  });

  const agent = await prisma.agent.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: demoAgent.name,
      },
    },
    update: {
      description: demoAgent.description,
      status: "ACTIVE",
    },
    create: {
      organizationId: organization.id,
      name: demoAgent.name,
      description: demoAgent.description,
      status: "ACTIVE",
    },
  });

  const connector = await prisma.connector.upsert({
    where: {
      organizationId_name: {
        organizationId: organization.id,
        name: demoConnector.name,
      },
    },
    update: {
      type: demoConnector.type,
      status: "ACTIVE",
      configuration: {
        mode: "demo_controlled",
        stripe_called: false,
      },
      encryptedCredentialsPlaceholder: {
        status: "not_configured",
        note: "Demo placeholder only; no Stripe credentials are used.",
      },
    },
    create: {
      organizationId: organization.id,
      name: demoConnector.name,
      type: demoConnector.type,
      status: "ACTIVE",
      configuration: {
        mode: "demo_controlled",
        stripe_called: false,
      },
      encryptedCredentialsPlaceholder: {
        status: "not_configured",
        note: "Demo placeholder only; no Stripe credentials are used.",
      },
    },
  });

  return {
    organization,
    reviewer,
    agent,
    connector,
  };
}

async function upsertDemoAuthUser(
  prisma: DemoPrismaClient,
  {
    email,
    name,
  }: {
    email: string;
    name: string;
  },
) {
  return prisma.authUser.upsert({
    where: {
      email,
    },
    update: {
      name,
      emailVerified: false,
      image: null,
    },
    create: {
      name,
      email,
      emailVerified: false,
      image: null,
    },
  });
}

async function ensureDemoReviewerMembership(
  prisma: DemoPrismaClient,
  {
    organizationId,
    userId,
    authUserId,
  }: {
    organizationId: string;
    userId: string;
    authUserId: string;
  },
) {
  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    update: {
      authUserId,
      role: "REVIEWER",
      status: "ACTIVE",
    },
    create: {
      organizationId,
      userId,
      authUserId,
      role: "REVIEWER",
      status: "ACTIVE",
    },
  });
}

async function ensureDemoAgentApiKey(
  prisma: DemoPrismaClient,
  {
    organizationId,
    agentId,
  }: {
    organizationId: string;
    agentId: string;
  },
) {
  const configuredApiKey = readConfiguredDemoAgentApiKey();
  const existingApiKey = await prisma.agentApiKey.findFirst({
    where: {
      organizationId,
      agentId,
      name: demoApiKeyName,
    },
  });

  if (configuredApiKey) {
    const keyPrefix = extractDemoApiKeyPrefix(configuredApiKey.apiKey);
    const data = {
      keyPrefix,
      keyHash: hashApiKey(configuredApiKey.apiKey),
      status: "ACTIVE",
      expiresAt: null,
      revokedAt: null,
    };

    if (existingApiKey) {
      await prisma.agentApiKey.update({
        where: {
          id: existingApiKey.id,
        },
        data,
      });
    } else {
      await prisma.agentApiKey.create({
        data: {
          organizationId,
          agentId,
          name: demoApiKeyName,
          ...data,
        },
      });
    }

    return {
      source: "configured" as const,
      envName: configuredApiKey.envName,
      keyPrefix,
    };
  }

  if (existingApiKey) {
    return {
      source: "existing" as const,
      keyPrefix: existingApiKey.keyPrefix,
    };
  }

  return {
    source: "missing" as const,
  };
}

async function upsertDemoPolicies(
  prisma: DemoPrismaClient,
  {
    organizationId,
    connectorId,
  }: {
    organizationId: string;
    connectorId: string;
  },
): Promise<Map<DemoPolicyKey, string>> {
  const policyIds = new Map<DemoPolicyKey, string>();

  for (const policy of policyDefinitions) {
    const record = await prisma.policy.upsert({
      where: {
        organizationId_name: {
          organizationId,
          name: policy.name,
        },
      },
      update: {
        connectorId,
        description: policy.description,
        status: "ACTIVE",
        decision: policy.decision,
        priority: policy.priority,
        rules: policy.rules,
      },
      create: {
        organizationId,
        connectorId,
        name: policy.name,
        description: policy.description,
        status: "ACTIVE",
        decision: policy.decision,
        priority: policy.priority,
        rules: policy.rules,
      },
    });

    policyIds.set(policy.key, record.id);
  }

  return policyIds;
}

async function cleanupLegacySeededDemoRefundRequests(
  prisma: DemoPrismaClient,
  {
    organizationId,
    agentId,
    connectorId,
  }: {
    organizationId: string;
    agentId: string;
    connectorId: string;
  },
) {
  return prisma.actionRequest.deleteMany({
    where: {
      organizationId,
      agentId,
      connectorId,
      operation: "refund.create",
      id: {
        startsWith: "demo-refund-",
        notIn: curatedDemoRefundRequestIds,
      },
    },
  });
}

async function upsertDemoRefundRequest(
  prisma: DemoPrismaClient,
  {
    refundRequest,
    organizationId,
    reviewerId,
    agentId,
    connectorId,
    policyId,
  }: {
    refundRequest: DemoRefundRequest;
    organizationId: string;
    reviewerId: string;
    agentId: string;
    connectorId: string;
    policyId: string;
  },
) {
  const createdAt = minutesAgo(refundRequest.ageMinutes);
  const decidedAt = addMinutes(createdAt, 1);
  const resource = buildDemoResource(refundRequest);
  const parameters = buildDemoParameters(refundRequest);
  const context = buildDemoContext(refundRequest);
  const requestPayload = {
    connector: demoConnector.type,
    action: "refund.create",
    resource,
    parameters,
    context,
  };

  await prisma.actionRequest.upsert({
    where: {
      id: refundRequest.id,
    },
    update: {
      organizationId,
      agentId,
      connectorId,
      policyId,
      operation: "refund.create",
      resource,
      parameters,
      context,
      requestPayload,
      decision: refundRequest.decision,
      status: refundRequest.status,
      decisionReason: refundRequest.policyReason,
      decidedAt,
      createdAt,
    },
    create: {
      id: refundRequest.id,
      organizationId,
      agentId,
      connectorId,
      policyId,
      operation: "refund.create",
      resource,
      parameters,
      context,
      requestPayload,
      decision: refundRequest.decision,
      status: refundRequest.status,
      decisionReason: refundRequest.policyReason,
      decidedAt,
      createdAt,
    },
  });

  if (refundRequest.mode === "stripe_test_mode") {
    await upsertDemoStripePaymentObject(prisma, {
      refundRequest,
      organizationId,
      connectorId,
      createdAt,
    });
  }

  const approvalId = refundRequest.approval
    ? await upsertDemoApproval(prisma, {
        refundRequest,
        organizationId,
        reviewerId,
        createdAt,
      })
    : null;
  const executionId = refundRequest.execution
    ? await upsertDemoExecution(prisma, {
        refundRequest,
        organizationId,
        connectorId,
        createdAt,
      })
    : null;

  await upsertDemoAuditEvents(prisma, {
    refundRequest,
    organizationId,
    agentId,
    reviewerId,
    approvalId,
    executionId,
    createdAt,
  });
}

async function upsertDemoStripePaymentObject(
  prisma: DemoPrismaClient,
  {
    refundRequest,
    organizationId,
    connectorId,
    createdAt,
  }: {
    refundRequest: DemoRefundRequest;
    organizationId: string;
    connectorId: string;
    createdAt: Date;
  },
) {
  const amountMinor = toMinorUnits(refundRequest.amount);
  const data = {
    organizationId,
    connectorId,
    mode: "TEST",
    paymentIntentId: refundRequest.paymentIntentId,
    chargeId: refundRequest.chargeId,
    amountMinor: Math.max(amountMinor, amountMinor + 5000),
    amountRefundedMinor: 0,
    currency: refundRequest.currency.toUpperCase(),
    status: "succeeded",
    livemode: false,
    safeSnapshot: {
      object: "payment_intent",
      id: refundRequest.paymentIntentId,
      charge_id: refundRequest.chargeId,
      livemode: false,
      demo_seed: true,
      fictional_data: true,
    },
    lastSyncedAt: createdAt,
    createdAt,
  };

  await prisma.stripePaymentObject.upsert({
    where: {
      id: `stripe-payment-object-${refundRequest.id}`,
    },
    update: data,
    create: {
      id: `stripe-payment-object-${refundRequest.id}`,
      ...data,
    },
  });
}

async function upsertDemoApproval(
  prisma: DemoPrismaClient,
  {
    refundRequest,
    organizationId,
    reviewerId,
    createdAt,
  }: {
    refundRequest: DemoRefundRequest;
    organizationId: string;
    reviewerId: string;
    createdAt: Date;
  },
): Promise<string> {
  const approval = refundRequest.approval;

  if (!approval) {
    throw new Error("Demo approval is required.");
  }

  const approvalId = `approval-${refundRequest.id}`;
  const reviewedAt = approval.reviewedMinutesAfterCreate
    ? addMinutes(createdAt, approval.reviewedMinutesAfterCreate)
    : null;
  const expiresAt = approval.expiresMinutesAfterCreate
    ? addMinutes(createdAt, approval.expiresMinutesAfterCreate)
    : null;
  const data = {
    organizationId,
    actionRequestId: refundRequest.id,
    reviewerId: reviewedAt ? reviewerId : null,
    status: approval.status,
    reason: approval.reason,
    reviewedAt,
    expiresAt,
    createdAt: addMinutes(createdAt, 2),
  };

  await prisma.approval.upsert({
    where: {
      id: approvalId,
    },
    update: data,
    create: {
      id: approvalId,
      ...data,
    },
  });

  return approvalId;
}

async function upsertDemoExecution(
  prisma: DemoPrismaClient,
  {
    refundRequest,
    organizationId,
    connectorId,
    createdAt,
  }: {
    refundRequest: DemoRefundRequest;
    organizationId: string;
    connectorId: string;
    createdAt: Date;
  },
): Promise<string> {
  const execution = refundRequest.execution;

  if (!execution) {
    throw new Error("Demo execution is required.");
  }

  const executionId = `execution-${refundRequest.id}`;
  const startedAt = addMinutes(createdAt, execution.startedMinutesAfterCreate);
  const completedAt = addMinutes(
    createdAt,
    execution.completedMinutesAfterCreate,
  );
  const data = {
    organizationId,
    actionRequestId: refundRequest.id,
    connectorId,
    mode: "DRY_RUN",
    status: execution.status,
    grantTokenHash: null,
    grantExpiresAt: null,
    responsePayload: {
      demo_simulation: refundRequest.mode === "demo_simulation",
      stripe_test_mode: refundRequest.mode === "stripe_test_mode",
      stripe_called: false,
      money_moved: false,
      livemode: false,
      message:
        execution.status === "SUCCEEDED"
          ? "Demo execution completed for evidence only."
          : "Demo execution needs attention; no Stripe call was made.",
      refund_amount: refundRequest.amount,
      currency: refundRequest.currency.toUpperCase(),
      customer_id: refundRequest.customer.id,
      order_id: refundRequest.order.id,
    },
    errorMetadata:
      execution.status === "FAILED"
        ? {
            reason: refundRequest.webhookStatus ?? refundRequest.refundReason,
            stripe_called: false,
            money_moved: false,
            livemode: false,
          }
        : null,
    startedAt,
    completedAt,
    createdAt: startedAt,
  };

  await prisma.execution.upsert({
    where: {
      id: executionId,
    },
    update: data,
    create: {
      id: executionId,
      ...data,
    },
  });

  return executionId;
}

async function upsertDemoAuditEvents(
  prisma: DemoPrismaClient,
  {
    refundRequest,
    organizationId,
    agentId,
    reviewerId,
    approvalId,
    executionId,
    createdAt,
  }: {
    refundRequest: DemoRefundRequest;
    organizationId: string;
    agentId: string;
    reviewerId: string;
    approvalId: string | null;
    executionId: string | null;
    createdAt: Date;
  },
) {
  const metadataBase = {
    event_source: "refundhold_demo_seed",
    action: "refund.create",
    demo_mode: refundRequest.mode,
    demo_simulation: refundRequest.mode === "demo_simulation",
    stripe_test_mode: refundRequest.mode === "stripe_test_mode",
    stripe_called: false,
    money_moved: false,
    livemode: false,
    fictional_data: true,
    amount: refundRequest.amount,
    amount_minor: toMinorUnits(refundRequest.amount),
    currency: refundRequest.currency.toUpperCase(),
    customer_id: refundRequest.customer.id,
    order_id: refundRequest.order.id,
    idempotency_key: refundRequest.idempotencyKey,
    policy_decision: refundRequest.decision.toLowerCase(),
    risk_score: refundRequest.riskScore,
    risk_label: refundRequest.riskLabel,
    risk_reason: refundRequest.riskReason,
    refund_reason: refundRequest.refundReason,
    webhook_status: refundRequest.webhookStatus ?? null,
  };

  await upsertAuditEvent(prisma, {
    id: `audit-${refundRequest.id}-request-received`,
    organizationId,
    actionRequestId: refundRequest.id,
    agentId,
    actorType: "AGENT",
    type: "REQUEST_RECEIVED",
    metadata: {
      ...metadataBase,
      event: "request_received",
      ai_agent_action: "proposed Stripe refund",
      customer_message: refundRequest.customerMessage,
    },
    createdAt,
  });
  if (refundRequest.mode === "stripe_test_mode") {
    await upsertAuditEvent(prisma, {
      id: `audit-${refundRequest.id}-stripe-payment-reflected`,
      organizationId,
      actionRequestId: refundRequest.id,
      agentId,
      actorType: "SYSTEM",
      type: "STRIPE_PAYMENT_OBJECT_REFLECTED",
      metadata: {
        ...metadataBase,
        event: "stripe_payment_object_reflected",
        payment_intent_id: refundRequest.paymentIntentId,
        charge_id: refundRequest.chargeId,
        requested_amount_minor: toMinorUnits(refundRequest.amount),
      },
      createdAt: addMinutes(createdAt, 1),
    });
  }
  await upsertAuditEvent(prisma, {
    id: `audit-${refundRequest.id}-policy-evaluated`,
    organizationId,
    actionRequestId: refundRequest.id,
    agentId,
    actorType: "AGENT",
    type: "POLICY_EVALUATED",
    metadata: {
      ...metadataBase,
      event: "policy_evaluated",
      reason: refundRequest.policyReason,
    },
    createdAt: addMinutes(createdAt, refundRequest.mode === "stripe_test_mode" ? 2 : 1),
  });
  await upsertAuditEvent(prisma, {
    id: `audit-${refundRequest.id}-decision-created`,
    organizationId,
    actionRequestId: refundRequest.id,
    agentId,
    actorType: "AGENT",
    type: "DECISION_CREATED",
    metadata: {
      ...metadataBase,
      event: "decision_created",
      status: refundRequest.status,
      reason: refundRequest.policyReason,
    },
    createdAt: addMinutes(createdAt, refundRequest.mode === "stripe_test_mode" ? 3 : 2),
  });

  if (approvalId && refundRequest.approval) {
    await upsertAuditEvent(prisma, {
      id: `audit-${refundRequest.id}-approval-requested`,
      organizationId,
      actionRequestId: refundRequest.id,
      approvalId,
      agentId,
      actorType: "SYSTEM",
      type: "APPROVAL_REQUESTED",
      metadata: {
        ...metadataBase,
        event: "approval_requested",
        approval_status: refundRequest.approval.status,
      },
      createdAt: addMinutes(createdAt, refundRequest.mode === "stripe_test_mode" ? 4 : 3),
    });

    if (refundRequest.approval.status === "APPROVED") {
      await upsertAuditEvent(prisma, {
        id: `audit-${refundRequest.id}-approval-approved`,
        organizationId,
        actionRequestId: refundRequest.id,
        approvalId,
        agentId,
        userId: reviewerId,
        actorType: "USER",
        type: "APPROVAL_APPROVED",
        metadata: {
          ...metadataBase,
          event: "approval_approved",
          comment: refundRequest.approval.reason,
        },
        createdAt: addMinutes(
          createdAt,
          refundRequest.approval.reviewedMinutesAfterCreate ?? 4,
        ),
      });
    }

    if (refundRequest.approval.status === "REJECTED") {
      await upsertAuditEvent(prisma, {
        id: `audit-${refundRequest.id}-approval-rejected`,
        organizationId,
        actionRequestId: refundRequest.id,
        approvalId,
        agentId,
        userId: reviewerId,
        actorType: "USER",
        type: "APPROVAL_REJECTED",
        metadata: {
          ...metadataBase,
          event: "approval_rejected",
          comment: refundRequest.approval.reason,
        },
        createdAt: addMinutes(
          createdAt,
          refundRequest.approval.reviewedMinutesAfterCreate ?? 4,
        ),
      });
    }
  }

  if (executionId && refundRequest.execution) {
    await upsertAuditEvent(prisma, {
      id: `audit-${refundRequest.id}-execution-started`,
      organizationId,
      actionRequestId: refundRequest.id,
      executionId,
      agentId,
      actorType: "SYSTEM",
      type: "EXECUTION_STARTED",
      metadata: {
        ...metadataBase,
        event: "execution_started",
        execution_mode: "demo_controlled",
      },
      createdAt: addMinutes(
        createdAt,
        refundRequest.execution.startedMinutesAfterCreate,
      ),
    });
    await upsertAuditEvent(prisma, {
      id: `audit-${refundRequest.id}-execution-succeeded`,
      organizationId,
      actionRequestId: refundRequest.id,
      executionId,
      agentId,
      actorType: "SYSTEM",
      type:
        refundRequest.execution.status === "SUCCEEDED"
          ? "EXECUTION_SUCCEEDED"
          : "EXECUTION_FAILED",
      metadata: {
        ...metadataBase,
        event:
          refundRequest.execution.status === "SUCCEEDED"
            ? "execution_succeeded"
            : "execution_failed",
        execution_mode: "demo_controlled",
        result:
          refundRequest.execution.status === "SUCCEEDED"
            ? "simulation_only"
            : (refundRequest.webhookStatus ?? "needs_attention"),
      },
      createdAt: addMinutes(
        createdAt,
        refundRequest.execution.completedMinutesAfterCreate,
      ),
    });

    if (refundRequest.webhookStatus) {
      await upsertAuditEvent(prisma, {
        id: `audit-${refundRequest.id}-webhook-received`,
        organizationId,
        actionRequestId: refundRequest.id,
        executionId,
        agentId,
        actorType: "SYSTEM",
        type: "STRIPE_WEBHOOK_RECEIVED",
        metadata: {
          ...metadataBase,
          event: "stripe_webhook_received",
          status: refundRequest.webhookStatus,
        },
        createdAt: addMinutes(
          createdAt,
          refundRequest.execution.completedMinutesAfterCreate + 1,
        ),
      });
    }
  }
}

async function upsertAuditEvent(
  prisma: DemoPrismaClient,
  event: {
    id: string;
    organizationId: string;
    actionRequestId: string;
    approvalId?: string;
    executionId?: string;
    agentId?: string;
    userId?: string;
    actorType: "USER" | "AGENT" | "SYSTEM";
    type:
      | "REQUEST_RECEIVED"
      | "STRIPE_PAYMENT_OBJECT_REFLECTED"
      | "POLICY_EVALUATED"
      | "DECISION_CREATED"
      | "APPROVAL_REQUESTED"
      | "APPROVAL_APPROVED"
      | "APPROVAL_REJECTED"
      | "EXECUTION_STARTED"
      | "EXECUTION_SUCCEEDED"
      | "EXECUTION_FAILED"
      | "STRIPE_WEBHOOK_RECEIVED";
    metadata: Record<string, unknown>;
    createdAt: Date;
  },
) {
  const data = {
    organizationId: event.organizationId,
    actionRequestId: event.actionRequestId,
    approvalId: event.approvalId ?? null,
    executionId: event.executionId ?? null,
    agentId: event.agentId ?? null,
    userId: event.userId ?? null,
    actorType: event.actorType,
    type: event.type,
    metadata: event.metadata,
    createdAt: event.createdAt,
  };

  await prisma.auditEvent.upsert({
    where: {
      id: event.id,
    },
    update: data,
    create: {
      id: event.id,
      ...data,
    },
  });
}

function buildDemoResource(refundRequest: DemoRefundRequest) {
  if (refundRequest.mode === "stripe_test_mode") {
    return {
      type: "stripe.payment_intent",
      payment_intent_id: refundRequest.paymentIntentId,
      charge_id: refundRequest.chargeId,
      customer_id: refundRequest.customer.id,
      order_id: refundRequest.order.id,
      livemode: false,
      fictional: true,
    };
  }

  return {
    type: "stripe.refund",
    payment_intent_id: refundRequest.paymentIntentId,
    charge_id: refundRequest.chargeId,
    customer_id: refundRequest.customer.id,
    order_id: refundRequest.order.id,
    demo_simulation: true,
    livemode: false,
    fictional: true,
  };
}

function buildDemoParameters(refundRequest: DemoRefundRequest) {
  const common = {
    amount: refundRequest.amount,
    currency: refundRequest.currency,
    reason: "requested_by_customer",
    refund_reason: refundRequest.refundReason,
    idempotency_key: refundRequest.idempotencyKey,
    stripe_called: false,
    money_moved: false,
    livemode: false,
    webhook_status: refundRequest.webhookStatus ?? null,
  };

  if (refundRequest.mode === "stripe_test_mode") {
    return {
      ...common,
      amount_minor: toMinorUnits(refundRequest.amount),
      payment_intent_id: refundRequest.paymentIntentId,
      charge_id: refundRequest.chargeId,
      stripe_mode: "test",
    };
  }

  return {
    ...common,
    demo_simulation: true,
  };
}

function buildDemoContext(refundRequest: DemoRefundRequest) {
  return {
    demo_mode: refundRequest.mode,
    demo_simulation: refundRequest.mode === "demo_simulation",
    stripe_test_mode: refundRequest.mode === "stripe_test_mode",
    stripe_called: false,
    money_moved: false,
    livemode: false,
    ai_initiated: true,
    customer: refundRequest.customer,
    order: refundRequest.order,
    order_summary: refundRequest.order.summary,
    refund_reason: refundRequest.refundReason,
    risk_reason: refundRequest.riskReason,
    idempotency_key: refundRequest.idempotencyKey,
    webhook_status: refundRequest.webhookStatus ?? null,
    risk: {
      score: refundRequest.riskScore,
      label: refundRequest.riskLabel,
    },
    ai_agent: {
      name: demoAgent.name,
      proposed_action: "refund.create",
      rationale: refundRequest.customerMessage,
    },
    demo_notice:
      "Fictitious RefundHold demo data only. No live Stripe money moves.",
  };
}

function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

function getPolicyId(
  policyIds: Map<DemoPolicyKey, string>,
  key: DemoPolicyKey,
): string {
  const policyId = policyIds.get(key);

  if (!policyId) {
    throw new Error(`Missing demo policy: ${key}`);
  }

  return policyId;
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60 * 1000);
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function isMainModule() {
  const entrypoint = process.argv[1];

  return entrypoint
    ? import.meta.url === pathToFileURL(entrypoint).href
    : false;
}

if (isMainModule()) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
