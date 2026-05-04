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
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <AppHeader />
      {children}
    </main>
  );
}
