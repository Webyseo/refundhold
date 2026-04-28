import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { generateDemoApiKey, hashApiKey } from "../src/lib/security/api-keys";

const demoOrganization = {
  name: "RefundHold Demo",
  slug: "authrail-demo",
};

const demoUser = {
  email: "demo.reviewer@refundhold.com",
  displayName: "Demo Reviewer",
};

const demoAgent = {
  name: "Demo AI Support Agent",
  description: "Demo support agent for RefundHold dry_run development.",
};

const demoApiKeyName = "Demo Support Agent API Key";

const demoConnector = {
  name: "Stripe Test",
  type: "stripe_test",
};

type PrismaClientConstructor = new (options: {
  adapter: PrismaPg;
}) => DemoPrismaClient;

type DemoPrismaClient = {
  organization: {
    upsert: (args: unknown) => Promise<{ id: string }>;
  };
  user: {
    upsert: (args: unknown) => Promise<{ id: string }>;
  };
  agent: {
    upsert: (args: unknown) => Promise<{ id: string }>;
  };
  agentApiKey: {
    findFirst: (
      args: unknown,
    ) => Promise<{ id: string; keyPrefix: string } | null>;
    create: (args: unknown) => Promise<{ id: string }>;
    update: (args: unknown) => Promise<{ id: string }>;
  };
  connector: {
    upsert: (args: unknown) => Promise<{ id: string }>;
  };
  policy: {
    upsert: (args: unknown) => Promise<{ id: string }>;
  };
  $disconnect: () => Promise<void>;
};

async function main() {
  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    console.error("DATABASE_URL is required to run the RefundHold demo seed.");
    console.error(
      "Set DATABASE_URL to a local Postgres connection string, apply migrations, then run pnpm db:seed.",
    );
    process.exit(1);
  }

  const prisma = await createPrismaClient(databaseUrl);

  try {
    const organization = await prisma.organization.upsert({
      where: {
        slug: demoOrganization.slug,
      },
      update: {
        name: demoOrganization.name,
      },
      create: demoOrganization,
    });

    const reviewer = await prisma.user.upsert({
      where: {
        organizationId_email: {
          organizationId: organization.id,
          email: demoUser.email,
        },
      },
      update: {
        displayName: demoUser.displayName,
        status: "ACTIVE",
      },
      create: {
        organizationId: organization.id,
        email: demoUser.email,
        displayName: demoUser.displayName,
        status: "ACTIVE",
      },
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

    const demoApiKey = await ensureDemoAgentApiKey(prisma, {
      organizationId: organization.id,
      agentId: agent.id,
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
          mode: "test",
        },
        encryptedCredentialsPlaceholder: {
          status: "not_configured",
          note: "Demo placeholder only; credential encryption is not implemented.",
        },
      },
      create: {
        organizationId: organization.id,
        name: demoConnector.name,
        type: demoConnector.type,
        status: "ACTIVE",
        configuration: {
          mode: "test",
        },
        encryptedCredentialsPlaceholder: {
          status: "not_configured",
          note: "Demo placeholder only; credential encryption is not implemented.",
        },
      },
    });

    await upsertDemoRefundPolicies(prisma, {
      organizationId: organization.id,
      connectorId: connector.id,
    });

    console.log("RefundHold demo seed complete.");
    console.log(`Organization: ${demoOrganization.slug}`);
    console.log(`Reviewer: ${reviewer.id} (${demoUser.email})`);
    console.log(`Agent: ${agent.id} (${demoAgent.name})`);

    if (demoApiKey.source === "generated") {
      console.log("Generated demo agent API key for local development:");
      console.log(demoApiKey.key);
      console.log("Store this key locally now; only its hash was saved.");
    } else if (demoApiKey.source === "configured") {
      console.log(
        "Demo agent API key configured from AUTHRAIL_DEMO_AGENT_API_KEY.",
      );
    } else {
      console.log("Demo agent API key already exists; raw key was not shown.");
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
  const configuredApiKey = readConfiguredDemoApiKey();
  const existingApiKey = await prisma.agentApiKey.findFirst({
    where: {
      organizationId,
      agentId,
      name: demoApiKeyName,
    },
  });

  if (configuredApiKey) {
    const keyPrefix = extractApiKeyPrefix(configuredApiKey);
    const data = {
      keyPrefix,
      keyHash: hashApiKey(configuredApiKey),
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
      keyPrefix,
    };
  }

  if (existingApiKey) {
    return {
      source: "existing" as const,
      keyPrefix: existingApiKey.keyPrefix,
    };
  }

  const generatedApiKey = generateDemoApiKey();

  await prisma.agentApiKey.create({
    data: {
      organizationId,
      agentId,
      name: demoApiKeyName,
      keyPrefix: generatedApiKey.prefix,
      keyHash: hashApiKey(generatedApiKey.key),
      status: "ACTIVE",
    },
  });

  return {
    source: "generated" as const,
    ...generatedApiKey,
  };
}

function readConfiguredDemoApiKey(): string | null {
  const apiKey = process.env["AUTHRAIL_DEMO_AGENT_API_KEY"]?.trim();

  return apiKey && apiKey.length > 0 ? apiKey : null;
}

function extractApiKeyPrefix(apiKey: string): string {
  const separatorIndex = apiKey.lastIndexOf("_");

  if (separatorIndex <= 0 || separatorIndex === apiKey.length - 1) {
    throw new Error(
      "AUTHRAIL_DEMO_AGENT_API_KEY must use the local demo format <prefix>_<secret>.",
    );
  }

  return apiKey.slice(0, separatorIndex);
}

async function upsertDemoRefundPolicies(
  prisma: DemoPrismaClient,
  {
    organizationId,
    connectorId,
  }: {
    organizationId: string;
    connectorId: string;
  },
) {
  const policies = [
    {
      name: "Allow refunds under 50 USD",
      description: "Demo policy: low-value Stripe test refunds are allowed.",
      decision: "ALLOW",
      priority: 10,
      rules: {
        connector: "stripe_test",
        action: "refund.create",
        amount_lt: 50,
      },
    },
    {
      name: "Review refunds from 50 USD to 500 USD",
      description:
        "Demo policy: medium-value Stripe test refunds require human approval.",
      decision: "APPROVAL_REQUIRED",
      priority: 20,
      rules: {
        connector: "stripe_test",
        action: "refund.create",
        amount_gte: 50,
        amount_lte: 500,
      },
    },
    {
      name: "Deny refunds over 500 USD",
      description: "Demo policy: high-value Stripe test refunds are denied.",
      decision: "DENY",
      priority: 30,
      rules: {
        connector: "stripe_test",
        action: "refund.create",
        amount_gt: 500,
      },
    },
  ];

  for (const policy of policies) {
    await prisma.policy.upsert({
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
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
