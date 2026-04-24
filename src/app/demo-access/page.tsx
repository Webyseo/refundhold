import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS,
  DEMO_ACCESS_COOKIE_NAME,
  createDemoAccessCookieValue,
  getDemoAccessConfig,
  getSafeDemoAccessNextPath,
} from "@/lib/demo-access";

export default async function DemoAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = getSafeDemoAccessNextPath(getSearchValue(params["next"]));
  const error = getSearchValue(params["error"]);
  const demoAccess = getDemoAccessConfig(process.env);

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-16 text-zinc-950 sm:px-8">
      <section className="mx-auto max-w-xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
          AuthRail hosted demo
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Demo access required
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">
          This lightweight gate protects the demo dashboard from casual public
          access. It is not production authentication, SSO, IAM, or a user
          directory.
        </p>

        {!demoAccess.enabled ? (
          <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 p-4">
            <p className="text-sm font-semibold text-zinc-950">
              Demo access is disabled locally.
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              Set <code>AUTHRAIL_DEMO_ACCESS_ENABLED=true</code> and
              <code> AUTHRAIL_DEMO_ACCESS_PASSWORD</code> to test hosted-demo
              protection.
            </p>
          </div>
        ) : null}

        {demoAccess.enabled && !demoAccess.password ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-950">
              Demo access is enabled but no password is configured.
            </p>
            <p className="mt-2 text-sm leading-6 text-red-900">
              Set <code>AUTHRAIL_DEMO_ACCESS_PASSWORD</code> before exposing a
              hosted dashboard.
            </p>
          </div>
        ) : null}

        {demoAccess.enabled && demoAccess.password ? (
          <form action={submitDemoAccess} className="mt-6 space-y-4">
            <input type="hidden" name="next" value={nextPath} />
            <div>
              <label
                htmlFor="demo-access-password"
                className="text-sm font-semibold text-zinc-950"
              >
                Demo password
              </label>
              <input
                id="demo-access-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>

            {error === "invalid" ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                Invalid demo password.
              </p>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Continue to dashboard
            </button>
          </form>
        ) : null}
      </section>
    </main>
  );
}

async function submitDemoAccess(formData: FormData) {
  "use server";

  const demoAccess = getDemoAccessConfig(process.env);
  const nextPath = getSafeDemoAccessNextPath(
    getFormValue(formData.get("next")),
  );

  if (!demoAccess.enabled) {
    redirect(nextPath);
  }

  if (!demoAccess.password) {
    redirect(`/demo-access?next=${encodeURIComponent(nextPath)}`);
  }

  const providedPassword = getFormValue(formData.get("password"));

  if (providedPassword !== demoAccess.password) {
    redirect(
      `/demo-access?next=${encodeURIComponent(nextPath)}&error=invalid`,
    );
  }

  const cookieStore = await cookies();
  cookieStore.set({
    name: DEMO_ACCESS_COOKIE_NAME,
    value: await createDemoAccessCookieValue(demoAccess.password),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS,
  });

  redirect(nextPath);
}

function getSearchValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getFormValue(value: FormDataEntryValue | null): string | null {
  return typeof value === "string" ? value : null;
}
