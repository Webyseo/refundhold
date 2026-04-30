import Link from "next/link";

const docsLinks = [
  ["Docs home", "/docs"],
  ["Quickstart", "/docs/quickstart"],
  ["API reference", "/docs/api"],
  ["Test-mode runbook", "/docs/test-mode-runbook"],
  ["Stripe test-mode", "/docs/stripe-test-mode"],
  ["Pilot contract", "/docs/test-mode-pilot"],
  ["Acceptance contract", "/docs/pilot-acceptance"],
  ["Prevent bypass", "/docs/prevent-bypass"],
];

export function DocsNavigation({ currentPath }: { currentPath?: string }) {
  return (
    <nav
      aria-label="Docs navigation"
      className="docs-card mt-8 rounded-lg border border-zinc-800 bg-zinc-900/50 p-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <p className="shrink-0 text-sm font-semibold text-zinc-100">
          Docs navigation
        </p>
        <div className="flex min-w-0 flex-wrap gap-2">
          {docsLinks.map(([label, href]) => {
            const isCurrent = href === currentPath;

            return (
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={`inline-flex min-h-11 max-w-full items-center rounded-md border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 ${
                  isCurrent
                    ? "border-emerald-300/40 bg-emerald-300/10 text-emerald-100"
                    : "border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:bg-zinc-950 hover:text-zinc-50"
                }`}
                href={href}
                key={href}
              >
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
