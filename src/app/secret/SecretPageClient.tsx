"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Copy, ShieldAlert, Sparkles } from "lucide-react";

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
  const [copyError, setCopyError] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    let timeoutId: ReturnType<typeof window.setTimeout> | undefined;

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

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [token]);

    async function handleCopyCode() {
    if (!rewardCode || isCopied) return;

    try {
      await navigator.clipboard.writeText(rewardCode);
      setCopyError("");
      setIsCopied(true);

      window.setTimeout(() => {
        router.push("/");
      }, 5000);
    } catch {
      setCopyError("Failed to copy the code. Please copy it manually.");
    }
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-slate-100">
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
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-200" />
          <h1 className="mt-4 text-2xl font-semibold text-rose-100">
            Unauthorized or Expired Link
          </h1>
          <p className="mt-2 text-sm text-rose-100/80">
            The reward access link is invalid or has expired.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/80 p-8 text-center shadow-glow backdrop-blur">
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-cyan-200/80">
          <Sparkles className="h-4 w-4" />
          Reward Code Generated
        </div>

        <div className="mt-6 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 px-6 py-8">
          <p className="break-all font-mono text-4xl font-bold tracking-[0.25em] text-white sm:text-5xl">
            {rewardCode}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyCode}
          disabled={isCopied}
          className="mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Copy className="h-4 w-4" />
          {isCopied ? "Copied!" : "Copy Code"}
        </button>

        {copyError ? (
          <p className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {copyError}
          </p>
        ) : isCopied ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-300">
            <BadgeCheck className="h-4 w-4" />
            Code copied. Redirecting to the store...
          </p>
        ) : (
          <p className="mt-4 inline-flex items-center gap-2 text-sm text-slate-300">
            <BadgeCheck className="h-4 w-4 text-emerald-300" />
            Paste the code back into the store to claim your coins.
          </p>
        )}

        <p className="mt-3 text-sm text-slate-300">
          سيتم تحويلك إلى الصفحة الرئيسية خلال 5 ثوانٍ، أو{" "}
          <button
            type="button"
            onClick={() => router.push("/")}
            className="font-medium text-cyan-300 transition hover:text-cyan-200"
          >
            اضغط هنا للعودة الآن
          </button>
        </p>
      </section>
    </main>
  );
}
