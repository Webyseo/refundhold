import type { Metadata } from "next";
import "./globals.css";

import { GoogleAnalytics } from "@/components/google-analytics";
import { rootMetadata } from "@/lib/seo";

export const metadata: Metadata = rootMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
