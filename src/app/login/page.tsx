import { getAuthConfig } from "../../lib/auth/config";
import { LoginForm } from "./login-form";
import { createNoindexMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = createNoindexMetadata({
  title: "RefundHold Login",
  description: "Private RefundHold login page.",
  path: "/login",
});

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const authConfig = getAuthConfig(process.env);
  const params = await searchParams;
  const nextPath = getSafeLoginNextPath(getSearchValue(params["next"]));
  const error = getSearchValue(params["error"]);

  return (
    <LoginContent
      authEnabled={authConfig.authEnabled}
      nextPath={nextPath}
      error={error}
    />
  );
}

export function LoginContent({
  authEnabled,
  nextPath,
  error,
}: {
  authEnabled: boolean;
  nextPath: string;
  error: string | null;
}) {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-16 text-zinc-950 sm:px-8">
      <section className="mx-auto max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
          RefundHold
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Login</h1>

        {authEnabled ? (
          <>
            {error === "invalid" ? (
              <p className="mt-6 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                Invalid email or password.
              </p>
            ) : null}
            <LoginForm nextPath={nextPath} />
          </>
        ) : (
          <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-950">
              Login is not enabled for this demo.
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Use the hosted demo gate to view the current RefundHold
              dashboard.
            </p>
            <a
              href="/demo-access"
              className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Use demo access
            </a>
          </div>
        )}
      </section>
    </main>
  );
}

export function getSafeLoginNextPath(value: string | null): string {
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

function getSearchValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}
