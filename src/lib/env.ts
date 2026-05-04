export type EnvRecord = Partial<Record<string, string | undefined>>;

export function readEnvWithLegacy(
  env: EnvRecord,
  preferredName: string,
  legacyName: string,
): string | undefined {
  if (Object.prototype.hasOwnProperty.call(env, preferredName)) {
    return env[preferredName];
  }

  return env[legacyName];
}

export function readOptionalEnvWithLegacy(
  env: EnvRecord,
  preferredName: string,
  legacyName: string,
): string | null {
  const trimmed = readEnvWithLegacy(env, preferredName, legacyName)?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function readEnabledEnvWithLegacy(
  env: EnvRecord,
  preferredName: string,
  legacyName: string,
): boolean {
  return isEnabledValue(readEnvWithLegacy(env, preferredName, legacyName));
}

export function isEnabledValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}
