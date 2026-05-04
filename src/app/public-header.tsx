import Link from "next/link";

const navLinks = [
  ["Demo", "/demo"],
  ["Reviewer demo", "/demo/reviewer"],
  ["Docs", "/docs"],
  ["Security", "/security"],
  ["Contact", "/contact"],
] as const;

const linkClass =
  "inline-flex min-h-11 items-center rounded-md px-3 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 hover:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950";

const activeLinkClass =
  "bg-zinc-900 text-zinc-50 ring-1 ring-zinc-800";

const footerLinks = [
  ["Contact", "/contact"],
  ["Security", "/security"],
  ["Privacy", "/privacy"],
  ["Terms", "/terms"],
] as const;

export function PublicHeader({ currentPath }: { currentPath?: string }) {
  return (
    <header className="border-b border-zinc-900 bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <Link
          className="inline-flex min-h-11 items-center rounded-md text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300 transition hover:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
          href="/"
        >
          RefundHold
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {navLinks.map(([label, href]) => {
            const active = isActivePublicPath(currentPath, href);

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`${linkClass} ${active ? activeLinkClass : ""}`}
                href={href}
                key={href}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        <details className="group relative md:hidden">
          <summary
            aria-label="Open navigation menu"
            className="flex min-h-11 cursor-pointer list-none items-center rounded-md border border-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-100 transition hover:border-zinc-600 hover:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 [&::-webkit-details-marker]:hidden"
          >
            <span aria-hidden="true" className="mr-2 grid gap-1">
              <span className="block h-0.5 w-4 rounded-full bg-current" />
              <span className="block h-0.5 w-4 rounded-full bg-current" />
              <span className="block h-0.5 w-4 rounded-full bg-current" />
            </span>
            Menu
          </summary>
          <nav
            aria-label="Mobile primary"
            className="absolute right-0 z-20 mt-3 w-[min(18rem,calc(100vw-3rem))] rounded-lg border border-zinc-800 bg-zinc-950 p-2 shadow-2xl shadow-black/40"
          >
            {navLinks.map(([label, href]) => {
              const active = isActivePublicPath(currentPath, href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={`${linkClass} w-full justify-start ${
                    active ? activeLinkClass : ""
                  }`}
                  href={href}
                  key={href}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </details>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-zinc-900 bg-zinc-950 text-zinc-400">
      <div className="mx-auto grid max-w-7xl gap-5 px-6 py-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="Footer"
          className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm font-semibold"
        >
          {footerLinks.map(([label, href]) => (
            <Link
              className="rounded-md transition hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
              href={href}
              key={href}
            >
              {label}
            </Link>
          ))}
        </nav>
        <p className="text-sm leading-6 text-zinc-400 lg:text-right xl:whitespace-nowrap">
          RefundHold is not affiliated with, endorsed by, or sponsored by
          Stripe. Stripe is a trademark of Stripe, Inc.
        </p>
      </div>
    </footer>
  );
}

function isActivePublicPath(currentPath: string | undefined, href: string) {
  if (!currentPath) {
    return false;
  }

  if (href === "/docs") {
    return currentPath === "/docs" || currentPath.startsWith("/docs/");
  }

  return currentPath === href;
}
