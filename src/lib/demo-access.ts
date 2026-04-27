export const DEMO_ACCESS_COOKIE_NAME = "authrail_demo_access";
export const DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

const COOKIE_VERSION = "v1";
const SIGNATURE_PAYLOAD = "authrail-demo-access";
const PASSWORD_COMPARISON_KEY = "refundhold-demo-access-password-comparison-v1";

type DemoAccessEnv = {
  [key: string]: string | undefined;
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
  const enabled = isEnabledValue(env.AUTHRAIL_DEMO_ACCESS_ENABLED);
  const password = env.AUTHRAIL_DEMO_ACCESS_PASSWORD?.trim() || null;

  return {
    enabled,
    password,
  };
}

export function getDemoAccessStatus(env: DemoAccessEnv): DemoAccessStatus {
  return {
    enabled: isEnabledValue(env.AUTHRAIL_DEMO_ACCESS_ENABLED),
    hasPassword: Boolean(env.AUTHRAIL_DEMO_ACCESS_PASSWORD?.trim()),
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

function isEnabledValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
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
