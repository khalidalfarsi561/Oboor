"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function Spinner() {
  return (
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-300" />
  );
}

export default function SecretPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [rewardCode, setRewardCode] = useState("");

  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError(true);
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/verify-token", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = (await response.json()) as {
          code?: string;
          error?: string;
        };

        if (!response.ok || !data.code) {
          setError(true);
          return;
        }

        setRewardCode(data.code);
      } catch {
        setError(true);
      } finally {
        setIsLoading(false);
      }
    }

    verifyToken();
  }, [token]);

  function handleCopyCode() {
    if (!rewardCode) return;

    void navigator.clipboard.writeText(rewardCode);
    router.push("/?copied=true");
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/80 px-8 py-10 shadow-glow backdrop-blur">
          <Spinner />
          <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">
            Verifying access
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-3xl border border-rose-500/30 bg-rose-500/10 px-8 py-10 text-center shadow-glow">
          <h1 className="text-2xl font-semibold text-rose-100">
            Unauthorized or Expired Link
          </h1>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-center shadow-glow backdrop-blur">
        <p className="text-xs uppercase tracking-[0.35em] text-violet-300/80">
          Reward Code Generated
        </p>

        <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 px-6 py-8">
          <p className="break-all font-mono text-4xl font-bold tracking-[0.25em] text-white sm:text-5xl">
            {rewardCode}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          className="mt-6 min-h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 font-semibold text-white transition hover:brightness-110"
        >
          Copy Code
        </button>
      </section>
    </main>
  );
}
