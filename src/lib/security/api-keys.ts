import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { type EnvRecord, readOptionalEnvWithLegacy } from "../env";

const keyPrefixBytes = 5;
const keySecretBytes = 16;
const scryptKeyLength = 32;
const saltBytes = 16;
const hashAlgorithm = "scrypt";
const hashVersion = "v1";
const preferredDemoAgentApiKeyEnv = "REFUNDHOLD_DEMO_AGENT_API_KEY";
const legacyDemoAgentApiKeyEnv = "AUTHRAIL_DEMO_AGENT_API_KEY";

export type GeneratedDemoApiKey = {
  key: string;
  prefix: string;
};

export type ConfiguredDemoAgentApiKey = {
  apiKey: string;
  envName:
    | typeof preferredDemoAgentApiKeyEnv
    | typeof legacyDemoAgentApiKeyEnv;
};

export function generateDemoApiKey(): GeneratedDemoApiKey {
  const prefix = `ar_demo_${randomBytes(keyPrefixBytes).toString("hex")}`;
  const secret = randomBytes(keySecretBytes).toString("hex");

  return {
    key: `${prefix}_${secret}`,
    prefix,
  };
}

export function readConfiguredDemoAgentApiKey(
  env: EnvRecord = process.env,
): ConfiguredDemoAgentApiKey | null {
  const apiKey = readOptionalEnvWithLegacy(
    env,
    preferredDemoAgentApiKeyEnv,
    legacyDemoAgentApiKeyEnv,
  );

  if (apiKey) {
    return {
      apiKey,
      envName: Object.prototype.hasOwnProperty.call(
        env,
        preferredDemoAgentApiKeyEnv,
      )
        ? preferredDemoAgentApiKeyEnv
        : legacyDemoAgentApiKeyEnv,
    };
  }

  return null;
}

export function extractDemoApiKeyPrefix(apiKey: string): string {
  const separatorIndex = apiKey.lastIndexOf("_");

  if (separatorIndex <= 0 || separatorIndex === apiKey.length - 1) {
    throw new Error(
      "Demo agent API key must use the local demo format <prefix>_<secret>.",
    );
  }

  return apiKey.slice(0, separatorIndex);
}

export function hashApiKey(apiKey: string): string {
  const salt = randomBytes(saltBytes).toString("hex");
  const derivedKey = deriveKey(apiKey, salt);

  return `${hashAlgorithm}:${hashVersion}:${salt}:${derivedKey.toString("hex")}`;
}

export function verifyApiKey(apiKey: string, storedHash: string): boolean {
  const parsedHash = parseStoredHash(storedHash);

  if (!parsedHash) {
    return false;
  }

  const candidateKey = deriveKey(apiKey, parsedHash.salt);

  return timingSafeEqual(candidateKey, parsedHash.derivedKey);
}

function deriveKey(apiKey: string, salt: string): Buffer {
  return scryptSync(apiKey, salt, scryptKeyLength);
}

function parseStoredHash(
  storedHash: string,
): { salt: string; derivedKey: Buffer } | null {
  const [algorithm, version, salt, derivedKey] = storedHash.split(":");

  if (
    algorithm !== hashAlgorithm ||
    version !== hashVersion ||
    !salt ||
    !derivedKey ||
    !/^[a-f0-9]{32}$/.test(salt) ||
    !/^[a-f0-9]{64}$/.test(derivedKey)
  ) {
    return null;
  }

  return {
    salt,
    derivedKey: Buffer.from(derivedKey, "hex"),
  };
}
