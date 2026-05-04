import { AppHeader } from "./app-header";
import { createNoindexMetadata } from "@/lib/seo";

export const metadata = createNoindexMetadata({
  title: "RefundHold App",
  description: "Private RefundHold app dashboard.",
  path: "/app",
});

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen bg-stone-50 text-zinc-950">
      <AppHeader />
      {children}
    </main>
  );
}
