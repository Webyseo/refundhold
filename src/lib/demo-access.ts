import {
  readEnabledEnvWithLegacy,
  readOptionalEnvWithLegacy,
  type EnvRecord,
} from "./env";

export const DEMO_ACCESS_COOKIE_NAME = "authrail_demo_access";
export const DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

const COOKIE_VERSION = "v1";
const SIGNATURE_PAYLOAD = "authrail-demo-access";
const PASSWORD_COMPARISON_KEY = "refundhold-demo-access-password-comparison-v1";

type DemoAccessEnv = EnvRecord & {
  REFUNDHOLD_DEMO_ACCESS_ENABLED?: string;
  REFUNDHOLD_DEMO_ACCESS_PASSWORD?: string;
  AUTHRAIL_DEMO_ACCESS_ENABLED?: string;
  AUTHRAIL_DEMO_ACCESS_PASSWORD?: string;
};

export type DemoAccessConfig = {
  enabled: boolean;
  password: string | null;
};

export type DemoAccessStatus = {
  enabled: boolean;
  hasPassword: boolean;
};

export function getDemoAccessConfig(env: DemoAccessEnv): DemoAccessConfig {
  const enabled = readEnabledEnvWithLegacy(
    env,
    "REFUNDHOLD_DEMO_ACCESS_ENABLED",
    "AUTHRAIL_DEMO_ACCESS_ENABLED",
  );
  const password = readOptionalEnvWithLegacy(
    env,
    "REFUNDHOLD_DEMO_ACCESS_PASSWORD",
    "AUTHRAIL_DEMO_ACCESS_PASSWORD",
  );

  return {
    enabled,
    password,
  };
}

export function getDemoAccessStatus(env: DemoAccessEnv): DemoAccessStatus {
  return {
    enabled: readEnabledEnvWithLegacy(
      env,
      "REFUNDHOLD_DEMO_ACCESS_ENABLED",
      "AUTHRAIL_DEMO_ACCESS_ENABLED",
    ),
    hasPassword: Boolean(
      readOptionalEnvWithLegacy(
        env,
        "REFUNDHOLD_DEMO_ACCESS_PASSWORD",
        "AUTHRAIL_DEMO_ACCESS_PASSWORD",
      ),
    ),
  };
}

export function getSafeDemoAccessNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  let url: URL;

  try {
    url = new URL(value, "https://refundhold.invalid");
  } catch {
    return "/app";
  }

  if (url.origin !== "https://refundhold.invalid") {
    return "/app";
  }

  if (url.pathname === "/app" || url.pathname.startsWith("/app/")) {
    return `${url.pathname}${url.search}`;
  }

  return "/app";
}

export async function createDemoAccessCookieValue(
  password: string,
  now = new Date(),
): Promise<string> {
  const expiresAtMs =
    now.getTime() + DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS * 1000;
  const signature = await signDemoAccessCookie(password, expiresAtMs);

  return `${COOKIE_VERSION}.${expiresAtMs}.${signature}`;
}

export async function isValidDemoAccessCookieValue(
  cookieValue: string | null | undefined,
  password: string,
  now = new Date(),
): Promise<boolean> {
  if (!cookieValue) {
    return false;
  }

  const parts = cookieValue.split(".");

  if (parts.length !== 3) {
    return false;
  }

  const [version, expiresAtRaw, signature] = parts;

  if (version !== COOKIE_VERSION || !expiresAtRaw || !signature) {
    return false;
  }

  const expiresAtMs = Number(expiresAtRaw);
  const nowMs = now.getTime();

  if (
    !Number.isSafeInteger(expiresAtMs) ||
    expiresAtMs <= nowMs ||
    expiresAtMs - nowMs > DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS * 1000
  ) {
    return false;
  }

  const expectedSignature = await signDemoAccessCookie(password, expiresAtMs);

  return timingSafeStringEqual(signature, expectedSignature);
}

export async function isDemoAccessPasswordValid(
  providedPassword: string | null,
  expectedPassword: string,
): Promise<boolean> {
  if (!providedPassword) {
    return false;
  }

  const [providedDigest, expectedDigest] = await Promise.all([
    signWithHmac(PASSWORD_COMPARISON_KEY, providedPassword),
    signWithHmac(PASSWORD_COMPARISON_KEY, expectedPassword),
  ]);

  return timingSafeStringEqual(providedDigest, expectedDigest);
}

async function signDemoAccessCookie(
  password: string,
  expiresAtMs: number,
): Promise<string> {
  return signWithHmac(
    password,
    `${COOKIE_VERSION}:${SIGNATURE_PAYLOAD}:${expiresAtMs}`,
  );
}

async function signWithHmac(keyMaterial: string, payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(keyMaterial),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));

  return bytesToHex(new Uint8Array(signature));
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeStringEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false;
  }

  let diff = 0;

  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return diff === 0;
}
