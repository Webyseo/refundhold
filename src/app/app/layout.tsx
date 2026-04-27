import Link from "next/link";

import { clearDemoAccessFromDashboard } from "@/app/app/actions";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const reviewerEmail =
    process.env["AUTHRAIL_DEMO_REVIEWER_EMAIL"]?.trim() ||
    "reviewer@authrail.local";

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <Link
              href="/app"
              className="text-lg font-semibold tracking-tight text-zinc-950"
            >
              RefundHold
            </Link>
            <p className="mt-1 text-sm text-zinc-500">
              Demo reviewer:{" "}
              <span className="font-mono text-zinc-700">{reviewerEmail}</span>
            </p>
          </div>
          <nav className="flex items-center gap-2 text-sm font-medium">
            <Link
              href="/app"
              className="rounded-md px-3 py-2 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            >
              Overview
            </Link>
            <Link
              href="/app/action-requests"
              className="rounded-md bg-zinc-950 px-3 py-2 text-white hover:bg-zinc-800"
            >
              Refund requests
            </Link>
            <form action={clearDemoAccessFromDashboard}>
              <button
                type="submit"
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
              >
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      {children}
    </main>
  );
}
