import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { describe, expect, it, vi } from "vitest";

import {
  createSafeProvisioningSummary,
  provisionAuthUser,
  readAuthProvisioningConfig,
  type ProvisionAuthUserDependencies,
} from "./provision-auth-user";

const strongPassword = "local-password-123";
const execFileAsync = promisify(execFile);

describe("auth user provisioning", () => {
  it("fails closed when provisioning is disabled", () => {
    expect(() => readAuthProvisioningConfig({})).toThrow(
      "AUTHRAIL_AUTH_PROVISIONING_ENABLED must be true.",
    );
  });

  it("fails when the provisioning password is missing", () => {
    expect(() =>
      readAuthProvisioningConfig({
        AUTHRAIL_AUTH_PROVISIONING_ENABLED: "true",
        AUTHRAIL_PROVISION_EMAIL: "reviewer@example.com",
        AUTHRAIL_PROVISION_NAME: "Reviewer",
        AUTHRAIL_PROVISION_ORGANIZATION_ID: "org_123",
        AUTHRAIL_PROVISION_ROLE: "REVIEWER",
      }),
    ).toThrow("AUTHRAIL_PROVISION_PASSWORD is required.");
  });

  it("fails when the provisioning password is weak", () => {
    expect(() =>
      readAuthProvisioningConfig({
        AUTHRAIL_AUTH_PROVISIONING_ENABLED: "true",
        AUTHRAIL_PROVISION_EMAIL: "reviewer@example.com",
        AUTHRAIL_PROVISION_PASSWORD: "too-short",
        AUTHRAIL_PROVISION_NAME: "Reviewer",
        AUTHRAIL_PROVISION_ORGANIZATION_ID: "org_123",
        AUTHRAIL_PROVISION_ROLE: "REVIEWER",
      }),
    ).toThrow("AUTHRAIL_PROVISION_PASSWORD must be at least 12 characters.");
  });

  it("rejects production base URLs by default", () => {
    expect(() =>
      readAuthProvisioningConfig({
        AUTHRAIL_AUTH_PROVISIONING_ENABLED: "true",
        AUTHRAIL_PROVISION_EMAIL: "reviewer@example.com",
        AUTHRAIL_PROVISION_PASSWORD: strongPassword,
        AUTHRAIL_PROVISION_NAME: "Reviewer",
        AUTHRAIL_PROVISION_ORGANIZATION_ID: "org_123",
        AUTHRAIL_PROVISION_ROLE: "REVIEWER",
        BASE_URL: "https://refundhold.com",
      }),
    ).toThrow("Auth provisioning is blocked for production RefundHold URLs.");
  });

  it("fails if the organization does not exist", async () => {
    const deps = createDependencies({
      organization: null,
    });

    await expect(
      provisionAuthUser(
        {
          email: "reviewer@example.com",
          password: strongPassword,
          name: "Reviewer",
          organizationId: "org_missing",
          role: "REVIEWER",
        },
        deps,
      ),
    ).rejects.toThrow("AUTH_PROVISION_ORGANIZATION_NOT_FOUND");
  });

  it("creates and links AuthUser, domain User, and Membership", async () => {
    const deps = createDependencies();

    const result = await provisionAuthUser(
      {
        email: "Reviewer@Example.com",
        password: strongPassword,
        name: "Reviewer",
        organizationId: "org_123",
        role: "REVIEWER",
      },
      deps,
    );

    expect(result).toMatchObject({
      email: "reviewer@example.com",
      organizationId: "org_123",
      role: "REVIEWER",
      createdAuthUser: true,
      createdDomainUser: true,
    });
    expect(deps.createAuthUserWithCredential).toHaveBeenCalledWith({
      email: "reviewer@example.com",
      password: strongPassword,
      name: "Reviewer",
    });
    expect(deps.createDomainUser).toHaveBeenCalledWith({
      organizationId: "org_123",
      authUserId: "auth_user_created",
      email: "reviewer@example.com",
      displayName: "Reviewer",
    });
    expect(deps.upsertMembership).toHaveBeenCalledWith({
      organizationId: "org_123",
      authUserId: "auth_user_created",
      userId: "domain_user_created",
      role: "REVIEWER",
    });
  });

  it("is idempotent for an already provisioned credential user", async () => {
    const deps = createDependencies({
      authUser: {
        id: "auth_user_existing",
        email: "reviewer@example.com",
        name: "Reviewer",
      },
      hasCredentialAccount: true,
      domainUser: {
        id: "domain_user_existing",
        authUserId: "auth_user_existing",
      },
    });

    const result = await provisionAuthUser(
      {
        email: "reviewer@example.com",
        password: strongPassword,
        name: "Reviewer",
        organizationId: "org_123",
        role: "ADMIN",
      },
      deps,
    );

    expect(result).toMatchObject({
      authUserId: "auth_user_existing",
      domainUserId: "domain_user_existing",
      createdAuthUser: false,
      createdDomainUser: false,
      role: "ADMIN",
    });
    expect(deps.createAuthUserWithCredential).not.toHaveBeenCalled();
    expect(deps.createDomainUser).not.toHaveBeenCalled();
    expect(deps.upsertMembership).toHaveBeenCalledWith({
      organizationId: "org_123",
      authUserId: "auth_user_existing",
      userId: "domain_user_existing",
      role: "ADMIN",
    });
  });

  it("fails closed if an existing AuthUser has no credential account", async () => {
    const deps = createDependencies({
      authUser: {
        id: "auth_user_existing",
        email: "reviewer@example.com",
        name: "Reviewer",
      },
      hasCredentialAccount: false,
    });

    await expect(
      provisionAuthUser(
        {
          email: "reviewer@example.com",
          password: strongPassword,
          name: "Reviewer",
          organizationId: "org_123",
          role: "ADMIN",
        },
        deps,
      ),
    ).rejects.toThrow("AUTH_USER_EXISTS_WITHOUT_CREDENTIAL");
  });

  it("does not include the password in safe provisioning output", () => {
    const summary = createSafeProvisioningSummary({
      email: "reviewer@example.com",
      organizationId: "org_123",
      role: "OWNER",
      authUserId: "auth_user",
      domainUserId: "domain_user",
      createdAuthUser: true,
      createdDomainUser: true,
    });

    expect(summary).toContain("reviewer@example.com");
    expect(summary).toContain("org_123");
    expect(summary).toContain("OWNER");
    expect(summary).not.toContain(strongPassword);
    expect(summary).not.toContain("auth_user");
    expect(summary).not.toContain("domain_user");
  });

  it("starts the CLI under tsx before fail-closed config validation", async () => {
    try {
      await execFileAsync("pnpm", ["exec", "tsx", "scripts/provision-auth-user.ts"], {
        cwd: process.cwd(),
        env: {
          ...process.env,
          AUTHRAIL_AUTH_PROVISIONING_ENABLED: "false",
          AUTHRAIL_PROVISION_PASSWORD: "",
        },
        timeout: 10_000,
      });
      throw new Error("Expected provisioning CLI to fail closed.");
    } catch (error) {
      const output = getExecOutput(error);

      expect(output).toContain(
        "AUTHRAIL_AUTH_PROVISIONING_ENABLED must be true.",
      );
      expect(output).not.toContain("Top-level await");
      expect(output).not.toContain(strongPassword);
    }
  });
});

function getExecOutput(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return String(error);
  }

  const maybeOutput = error as { stderr?: unknown; stdout?: unknown };

  return `${String(maybeOutput.stdout ?? "")}${String(
    maybeOutput.stderr ?? "",
  )}`;
}

function createDependencies({
  organization = {
    id: "org_123",
    name: "RefundHold Demo",
  },
  authUser = null,
  hasCredentialAccount = false,
  domainUser = null,
}: {
  organization?: { id: string; name: string } | null;
  authUser?: { id: string; email: string; name: string } | null;
  hasCredentialAccount?: boolean;
  domainUser?: { id: string; authUserId: string | null } | null;
} = {}): ProvisionAuthUserDependencies {
  return {
    findOrganizationById: vi.fn(async () => organization),
    findAuthUserByEmail: vi.fn(async () => authUser),
    hasCredentialAccount: vi.fn(async () => hasCredentialAccount),
    createAuthUserWithCredential: vi.fn(async () => ({
      id: "auth_user_created",
      email: "reviewer@example.com",
      name: "Reviewer",
    })),
    findDomainUserByOrganizationEmail: vi.fn(async () => domainUser),
    createDomainUser: vi.fn(async () => ({
      id: "domain_user_created",
      authUserId: "auth_user_created",
    })),
    updateDomainUserAuthLink: vi.fn(async () => undefined),
    upsertMembership: vi.fn(async () => ({
      id: "membership_123",
    })),
  };
}
