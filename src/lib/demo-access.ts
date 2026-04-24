export const DEMO_ACCESS_COOKIE_NAME = "authrail_demo_access";
export const DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 8;

const COOKIE_VERSION = "v1";
const SIGNATURE_PAYLOAD = "authrail-demo-access";

type DemoAccessEnv = {
  [key: string]: string | undefined;
  AUTHRAIL_DEMO_ACCESS_ENABLED?: string;
  AUTHRAIL_DEMO_ACCESS_PASSWORD?: string;
};

export type DemoAccessConfig = {
  enabled: boolean;
  password: string | null;
};

export function getDemoAccessConfig(env: DemoAccessEnv): DemoAccessConfig {
  const enabled = isEnabledValue(env.AUTHRAIL_DEMO_ACCESS_ENABLED);
  const password = env.AUTHRAIL_DEMO_ACCESS_PASSWORD?.trim() || null;

  return {
    enabled,
    password,
  };
}

export function getSafeDemoAccessNextPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/app";
  }

  if (value === "/app" || value.startsWith("/app/") || value.startsWith("/app?")) {
    return value;
  }

  return "/app";
}

export async function createDemoAccessCookieValue(
  password: string,
): Promise<string> {
  const signature = await signDemoAccessPassword(password);

  return `${COOKIE_VERSION}.${signature}`;
}

export async function isValidDemoAccessCookieValue(
  cookieValue: string | null | undefined,
  password: string,
): Promise<boolean> {
  if (!cookieValue) {
    return false;
  }

  const expected = await createDemoAccessCookieValue(password);

  return timingSafeStringEqual(cookieValue, expected);
}

function isEnabledValue(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

async function signDemoAccessPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${COOKIE_VERSION}:${SIGNATURE_PAYLOAD}`),
  );

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
