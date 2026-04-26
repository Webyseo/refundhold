import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RefundHold",
  description:
    "Hold AI-initiated Stripe refunds until they are approved.",
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
