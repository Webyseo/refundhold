import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RefundHold",
  description:
    "RefundHold holds AI-initiated Stripe refunds until a rule or a human approves them.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
