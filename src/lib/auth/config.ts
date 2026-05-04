import {
  readEnabledEnvWithLegacy,
} from "../env";

export type AuthEnv = {
  [key: string]: string | undefined;
  REFUNDHOLD_AUTH_ENABLED?: string;
  REFUNDHOLD_AUTH_REQUIRED?: string;
  AUTHRAIL_AUTH_ENABLED?: string;
  AUTHRAIL_AUTH_REQUIRED?: string;
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
};

export type AuthConfig = {
  authEnabled: boolean;
  authRequired: boolean;
  betterAuthSecret: string | null;
  betterAuthUrl: string | null;
};

export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

export function getAuthConfig(env: AuthEnv = process.env): AuthConfig {
  const authEnabled = readEnabledEnvWithLegacy(
    env,
    "REFUNDHOLD_AUTH_ENABLED",
    "AUTHRAIL_AUTH_ENABLED",
  );
  const authRequired = readEnabledEnvWithLegacy(
    env,
    "REFUNDHOLD_AUTH_REQUIRED",
    "AUTHRAIL_AUTH_REQUIRED",
  );
  const betterAuthSecret = readOptionalSecret(env.BETTER_AUTH_SECRET);
  const betterAuthUrl = readOptionalValue(env.BETTER_AUTH_URL);

  if (authRequired && !authEnabled) {
    throw new AuthConfigError(
      "AUTHRAIL_AUTH_REQUIRED requires AUTHRAIL_AUTH_ENABLED.",
    );
  }

  if (authEnabled && !betterAuthSecret) {
    throw new AuthConfigError(
      "BETTER_AUTH_SECRET is required when AUTHRAIL_AUTH_ENABLED is enabled.",
    );
  }

  return {
    authEnabled,
    authRequired,
    betterAuthSecret,
    betterAuthUrl,
  };
}

export function redactAuthSecret(value: string | null | undefined): string {
  return readOptionalSecret(value) ? "configured" : "empty";
}

function readOptionalSecret(value: string | null | undefined): string | null {
  return readOptionalValue(value);
}

function readOptionalValue(value: string | null | undefined): string | null {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}
