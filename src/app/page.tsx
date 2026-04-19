import { Suspense } from "react";
import HomePageClient from "./HomePageClient";

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4 text-slate-100">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 px-8 py-10 shadow-glow backdrop-blur">
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">
              Loading store
            </p>
          </div>
        </main>
      }
    >
      <HomePageClient />
    </Suspense>
  );
}
