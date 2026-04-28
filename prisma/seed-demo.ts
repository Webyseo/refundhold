import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

const demoOrganization = {
  name: "RefundHold Demo",
  slug: "authrail-demo",
};

const demoAgent = {
  name: "RefundHold Demo AI Support Agent",
  description:
    "Fictitious support agent used for RefundHold dry_run commercial demos.",
};

const demoConnector = {
  name: "Stripe Demo (dry_run)",
  type: "stripe_demo",
};

type PrismaClientConstructor = new (options: {
  adapter: PrismaPg;
}) => DemoPrismaClient;

type UpsertDelegate = {
  upsert: (args: unknown) => Promise<{ id: string }>;
};

type DemoPrismaClient = {
  organization: UpsertDelegate;
  authUser: UpsertDelegate;
  user: UpsertDelegate;
  membership: UpsertDelegate;
  agent: UpsertDelegate;
  connector: UpsertDelegate;
  policy: UpsertDelegate;
  actionRequest: UpsertDelegate;
  approval: UpsertDelegate;
  execution: UpsertDelegate;
  auditEvent: UpsertDelegate;
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
  status: "SUCCEEDED";
  startedMinutesAfterCreate: number;
  completedMinutesAfterCreate: number;
};

type DemoRefundRequest = {
  id: string;
  ageMinutes: number;
  policyKey: DemoPolicyKey;
  status:
    | "ALLOWED"
    | "DENIED"
    | "APPROVAL_REQUIRED"
    | "APPROVED"
    | "REJECTED"
    | "EXECUTED";
  decision: "ALLOW" | "DENY" | "APPROVAL_REQUIRED";
  amount: number;
  currency: string;
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
      connector: "stripe_demo",
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
      connector: "stripe_demo",
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
      connector: "stripe_demo",
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
      connector: "stripe_demo",
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

const demoRefundRequests = [
  {
    id: "demo-refund-pending-approval",
    ageMinutes: 18,
    policyKey: "standardReview",
    status: "APPROVAL_REQUIRED",
    decision: "APPROVAL_REQUIRED",
    amount: 129.99,
    currency: "usd",
    customer: {
      id: "cus_demo_maya_chen",
      name: "Maya Chen",
      email: "maya.chen@example.test",
    },
    order: {
      id: "RH-DEMO-1007",
      summary: "Annual analytics add-on renewal",
    },
    paymentIntentId: "pi_demo_refundhold_pending_approval",
    chargeId: "ch_demo_refundhold_pending_approval",
    riskScore: 54,
    riskLabel: "medium",
    customerMessage:
      "Customer says the renewal was approved by the wrong teammate.",
    policyReason:
      "approval_required: amount is between 50 USD and 250 USD, so human review is required before any refund simulation.",
    approval: {
      status: "PENDING",
      reason: "Awaiting demo reviewer decision.",
      expiresMinutesAfterCreate: 480,
    },
  },
  {
    id: "demo-refund-approved-ready-dry-run",
    ageMinutes: 46,
    policyKey: "standardReview",
    status: "APPROVED",
    decision: "APPROVAL_REQUIRED",
    amount: 89.5,
    currency: "usd",
    customer: {
      id: "cus_demo_sam_rivera",
      name: "Sam Rivera",
      email: "sam.rivera@example.test",
    },
    order: {
      id: "RH-DEMO-1011",
      summary: "Duplicate monthly subscription charge",
    },
    paymentIntentId: "pi_demo_refundhold_approved_ready",
    chargeId: "ch_demo_refundhold_approved_ready",
    riskScore: 41,
    riskLabel: "medium",
    customerMessage:
      "AI support detected a duplicate charge after plan migration.",
    policyReason:
      "approval_required: duplicate-charge context is plausible, but the amount requires reviewer approval before dry_run execution.",
    approval: {
      status: "APPROVED",
      reason: "Approved for demo dry_run execution; duplicate charge evidence matches policy.",
      reviewedMinutesAfterCreate: 9,
    },
  },
  {
    id: "demo-refund-executed-dry-run",
    ageMinutes: 73,
    policyKey: "standardReview",
    status: "EXECUTED",
    decision: "APPROVAL_REQUIRED",
    amount: 176.25,
    currency: "usd",
    customer: {
      id: "cus_demo_lena_okafor",
      name: "Lena Okafor",
      email: "lena.okafor@example.test",
    },
    order: {
      id: "RH-DEMO-1020",
      summary: "Service outage credit",
    },
    paymentIntentId: "pi_demo_refundhold_executed_dry_run",
    chargeId: "ch_demo_refundhold_executed_dry_run",
    riskScore: 37,
    riskLabel: "medium",
    customerMessage:
      "Customer requested outage credit after SLA breach on demo account.",
    policyReason:
      "approval_required: reviewer approved the outage credit and RefundHold recorded a dry_run execution only.",
    approval: {
      status: "APPROVED",
      reason: "Approved after confirming the outage-credit evidence.",
      reviewedMinutesAfterCreate: 11,
    },
    execution: {
      status: "SUCCEEDED",
      startedMinutesAfterCreate: 14,
      completedMinutesAfterCreate: 15,
    },
  },
  {
    id: "demo-refund-rejected-blocked",
    ageMinutes: 121,
    policyKey: "highRiskReview",
    status: "REJECTED",
    decision: "APPROVAL_REQUIRED",
    amount: 318.4,
    currency: "usd",
    customer: {
      id: "cus_demo_noah_patel",
      name: "Noah Patel",
      email: "noah.patel@example.test",
    },
    order: {
      id: "RH-DEMO-1033",
      summary: "Enterprise onboarding package",
    },
    paymentIntentId: "pi_demo_refundhold_rejected_blocked",
    chargeId: "ch_demo_refundhold_rejected_blocked",
    riskScore: 82,
    riskLabel: "high",
    customerMessage:
      "AI support proposed a refund after an unusually short cancellation note.",
    policyReason:
      "approval_required: high-risk context and elevated amount required review; reviewer rejected and blocked the dry_run refund.",
    approval: {
      status: "REJECTED",
      reason:
        "Rejected in demo because the order context did not support the requested refund.",
      reviewedMinutesAfterCreate: 16,
    },
  },
  {
    id: "demo-refund-high-risk-pending",
    ageMinutes: 8,
    policyKey: "highRiskReview",
    status: "APPROVAL_REQUIRED",
    decision: "APPROVAL_REQUIRED",
    amount: 462,
    currency: "usd",
    customer: {
      id: "cus_demo_amelia_brooks",
      name: "Amelia Brooks",
      email: "amelia.brooks@example.test",
    },
    order: {
      id: "RH-DEMO-1045",
      summary: "Custom implementation deposit",
    },
    paymentIntentId: "pi_demo_refundhold_high_risk_pending",
    chargeId: "ch_demo_refundhold_high_risk_pending",
    riskScore: 91,
    riskLabel: "high",
    customerMessage:
      "AI support requested a refund for a non-refundable implementation deposit.",
    policyReason:
      "approval_required: elevated amount and non-refundable order context must be reviewed before any dry_run execution.",
    approval: {
      status: "PENDING",
      reason: "Awaiting high-risk demo review.",
      expiresMinutesAfterCreate: 480,
    },
  },
  {
    id: "demo-refund-low-risk-auto-allow",
    ageMinutes: 157,
    policyKey: "lowRiskAllow",
    status: "ALLOWED",
    decision: "ALLOW",
    amount: 24.99,
    currency: "usd",
    customer: {
      id: "cus_demo_oliver_kim",
      name: "Oliver Kim",
      email: "oliver.kim@example.test",
    },
    order: {
      id: "RH-DEMO-1052",
      summary: "Unused add-on trial fee",
    },
    paymentIntentId: "pi_demo_refundhold_low_risk_allow",
    chargeId: "ch_demo_refundhold_low_risk_allow",
    riskScore: 12,
    riskLabel: "low",
    customerMessage:
      "AI support found a small unused add-on charge within refund policy.",
    policyReason:
      "allow: low-risk amount under 50 USD can be allowed automatically in dry_run demo mode.",
  },
] satisfies DemoRefundRequest[];

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
    const policyIds = await upsertDemoPolicies(prisma, {
      organizationId: baseRecords.organization.id,
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
      `RefundHold demo seed complete: ${demoRefundRequests.length} dry_run refund requests are available.`,
    );
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
        mode: "dry_run",
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
        mode: "dry_run",
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
      dry_run: true,
      stripe_called: false,
      money_moved: false,
      message: "Dry-run execution completed for demo evidence only.",
      refund_amount: refundRequest.amount,
      currency: refundRequest.currency.toUpperCase(),
      customer_id: refundRequest.customer.id,
      order_id: refundRequest.order.id,
    },
    errorMetadata: null,
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
    dry_run: true,
    stripe_called: false,
    money_moved: false,
    fictional_data: true,
    amount: refundRequest.amount,
    currency: refundRequest.currency.toUpperCase(),
    customer_id: refundRequest.customer.id,
    order_id: refundRequest.order.id,
    policy_decision: refundRequest.decision.toLowerCase(),
    risk_score: refundRequest.riskScore,
    risk_label: refundRequest.riskLabel,
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
    createdAt: addMinutes(createdAt, 1),
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
    createdAt: addMinutes(createdAt, 2),
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
      createdAt: addMinutes(createdAt, 3),
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
        execution_mode: "dry_run",
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
      type: "EXECUTION_SUCCEEDED",
      metadata: {
        ...metadataBase,
        event: "execution_succeeded",
        execution_mode: "dry_run",
        result: "simulation_only",
      },
      createdAt: addMinutes(
        createdAt,
        refundRequest.execution.completedMinutesAfterCreate,
      ),
    });
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
      | "POLICY_EVALUATED"
      | "DECISION_CREATED"
      | "APPROVAL_REQUESTED"
      | "APPROVAL_APPROVED"
      | "APPROVAL_REJECTED"
      | "EXECUTION_STARTED"
      | "EXECUTION_SUCCEEDED";
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
  return {
    type: "stripe.refund",
    payment_intent_id: refundRequest.paymentIntentId,
    charge_id: refundRequest.chargeId,
    customer_id: refundRequest.customer.id,
    order_id: refundRequest.order.id,
    dry_run: true,
    fictional: true,
  };
}

function buildDemoParameters(refundRequest: DemoRefundRequest) {
  return {
    amount: refundRequest.amount,
    currency: refundRequest.currency,
    reason: "requested_by_customer",
    dry_run: true,
    stripe_called: false,
    money_moved: false,
  };
}

function buildDemoContext(refundRequest: DemoRefundRequest) {
  return {
    dry_run: true,
    stripe_called: false,
    money_moved: false,
    ai_initiated: true,
    customer: refundRequest.customer,
    order: refundRequest.order,
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
      "Fictitious RefundHold demo data only. No Stripe API call is made.",
  };
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

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
