import { getAuthConfig } from "../../lib/auth/config";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const authConfig = getAuthConfig(process.env);

  return <LoginContent authEnabled={authConfig.authEnabled} />;
}

export function LoginContent({ authEnabled }: { authEnabled: boolean }) {
  return (
    <main className="min-h-screen bg-stone-50 px-5 py-16 text-zinc-950 sm:px-8">
      <section className="mx-auto max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-emerald-700">
          RefundHold
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Login</h1>

        {authEnabled ? (
          <form
            action="/api/auth/sign-in/email"
            method="post"
            className="mt-6 space-y-4"
          >
            <p className="text-sm leading-6 text-zinc-600">
              Sign in with a provisioned RefundHold reviewer account.
            </p>
            <div>
              <label
                htmlFor="email"
                className="text-sm font-semibold text-zinc-950"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="text-sm font-semibold text-zinc-950"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                required
              />
            </div>
            <input type="hidden" name="callbackURL" value="/app" />
            <button
              type="submit"
              className="w-full rounded-md bg-zinc-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Sign in
            </button>
          </form>
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
