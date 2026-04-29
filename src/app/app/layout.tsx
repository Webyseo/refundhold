import { AppHeader } from "./app-header";

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
