import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  DEMO_ACCESS_COOKIE_MAX_AGE_SECONDS,
  DEMO_ACCESS_COOKIE_NAME,
  createDemoAccessCookieValue,
  getDemoAccessConfig,
  getDemoAccessStatus,
  getSafeDemoAccessNextPath,
  isDemoAccessPasswordValid,
} from "@/lib/demo-access";

export default async function DemoAccessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const nextPath = getSafeDemoAccessNextPath(getSearchValue(params["next"]));
  const error = getSearchValue(params["error"]);
  const demoAccess = getDemoAccessStatus(process.env);

  return (
    <main className="min-h-screen bg-zinc-950 px-6 py-16 text-zinc-50">
      <section className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-xl flex-col justify-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-300">
          RefundHold
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Private demo access
        </h1>
        <p className="mt-5 text-base leading-7 text-zinc-300">
          Enter the password provided by the RefundHold team.
        </p>

        {!demoAccess.enabled ? (
          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm font-semibold text-zinc-100">
              Private demo access is not available right now.
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Use the public demo below, or ask the RefundHold team for private
              access.
            </p>
          </div>
        ) : null}

        {demoAccess.enabled && !demoAccess.hasPassword ? (
          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/70 p-5">
            <p className="text-sm font-semibold text-zinc-100">
              Private demo access is not available right now.
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Use the public demo below, or ask the RefundHold team for private
              access.
            </p>
          </div>
        ) : null}

        {demoAccess.enabled && demoAccess.hasPassword ? (
          <form
            action={submitDemoAccess}
            className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/70 p-5"
          >
            <input type="hidden" name="next" value={nextPath} />
            <div>
              <label
                htmlFor="demo-access-password"
                className="text-sm font-semibold text-zinc-100"
              >
                Password
              </label>
              <input
                id="demo-access-password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-50 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-300/20"
                required
              />
            </div>

            {error === "invalid" ? (
              <p className="mt-4 rounded-md border border-red-300/30 bg-red-300/10 px-3 py-2 text-sm text-red-100">
                The password did not work. Please try again.
              </p>
            ) : null}

            <button
              type="submit"
              className="mt-5 w-full rounded-md bg-emerald-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-200"
            >
              Continue
            </button>
          </form>
        ) : null}

        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-5">
          <p className="text-sm font-semibold text-zinc-100">
            Want to try the public demo instead?
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Public demo mode does not move real Stripe money.
          </p>
          <a
            className="mt-4 inline-flex items-center justify-center rounded-md border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
            href="/demo"
          >
            Open public demo
          </a>
        </div>
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

  if (
    !(await isDemoAccessPasswordValid(providedPassword, demoAccess.password))
  ) {
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
    path: "/app",
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
