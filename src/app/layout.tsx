import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthGate from "../components/AuthGate";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rewards Store",
  description: "PocketBase rewards redemption store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-950 text-slate-50 antialiased">
        <main className="min-h-screen bg-slate-950">
          <AuthGate>{children}</AuthGate>
        </main>
      </body>
    </html>
  );
}
