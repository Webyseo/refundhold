import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(
  join(process.cwd(), "prisma", "schema.prisma"),
  "utf8",
);

describe("auth identity Prisma schema", () => {
  it("keeps the existing domain User organization-scoped", () => {
    const userModel = readModel("User");

    expect(userModel).toContain("organizationId String");
    expect(userModel).toContain("@@unique([organizationId, email])");
    expect(userModel).not.toMatch(/\n\s+email\s+String\s+@unique\b/);
  });

  it("adds a global AuthUser identity with unique email", () => {
    const authUserModel = readModel("AuthUser");

    expect(authUserModel).toContain("email         String");
    expect(authUserModel).toContain("@@unique([email])");
    expect(authUserModel).toContain("@@map(\"auth_users\")");
  });

  it("adds Better Auth core session, account, and verification tables", () => {
    expect(readModel("AuthSession")).toContain("@@map(\"auth_sessions\")");
    expect(readModel("AuthAccount")).toContain("@@map(\"auth_accounts\")");
    expect(readModel("AuthVerification")).toContain(
      "@@map(\"auth_verifications\")",
    );
  });

  it("links domain users and memberships to AuthUser only through nullable fields", () => {
    const userModel = readModel("User");
    const membershipModel = readModel("Membership");

    expect(userModel).toContain("authUserId");
    expect(userModel).toContain("String?");
    expect(membershipModel).toContain("authUserId");
    expect(membershipModel).toContain("String?");
  });

  it("does not connect agent API keys to AuthUser", () => {
    expect(readModel("AgentApiKey")).not.toContain("authUser");
  });
});

function readModel(modelName: string): string {
  const match = schema.match(new RegExp(`model ${modelName} \\{[\\s\\S]*?\\n\\}`));

  if (!match) {
    throw new Error(`Expected model ${modelName} in Prisma schema.`);
  }

  return match[0];
}
