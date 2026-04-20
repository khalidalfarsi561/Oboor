import type { Metadata } from "next";
import type { ReactNode } from "react";
import AuthGate from "../components/AuthGate";
import PageTransition from "../components/PageTransition";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Neon Rewards Store",
    template: "%s | Neon Rewards Store",
  },
  description:
    "Claim reward links, track your coin balance, and browse preview rewards in PocketBase.",
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
          <AuthGate>
            <PageTransition>{children}</PageTransition>
          </AuthGate>
        </main>
      </body>
    </html>
  );
}
