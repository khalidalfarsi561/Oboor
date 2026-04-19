import { Suspense } from "react";
import SecretPageClient from "./SecretPageClient";

export default function SecretPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center px-4">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/80 px-8 py-10 shadow-glow backdrop-blur">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-300" />
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">
              Verifying access
            </p>
          </div>
        </main>
      }
    >
      <SecretPageClient />
    </Suspense>
  );
}
