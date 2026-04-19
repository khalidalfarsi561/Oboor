"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  ShieldAlert,
  Sparkles,
  LogIn,
} from "lucide-react";

type RewardResponse = {
  message?: string;
  coins?: number;
  error?: string;
};

function Spinner() {
  return (
    <div className="h-12 w-12 animate-spin rounded-full border-4 border-cyan-400/20 border-t-cyan-300" />
  );
}

function getFriendlyErrorMessage(error?: string, status?: number) {
  const normalized = (error ?? "").toLowerCase();

  if (status === 401 || normalized.includes("sign in")) {
    return "Please sign in to continue.";
  }

  if (
    normalized.includes("expired") ||
    normalized.includes("has expired") ||
    normalized.includes("link expired")
  ) {
    return "This reward link has expired.";
  }

  if (
    normalized.includes("already claimed") ||
    normalized.includes("already used")
  ) {
    return "This reward was already claimed.";
  }

  if (
    normalized.includes("invalid") ||
    normalized.includes("not found") ||
    normalized.includes("missing")
  ) {
    return "This reward link is invalid.";
  }

  return "We couldn’t claim this reward right now.";
}

export default function SecretPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [claimedCoins, setClaimedCoins] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const hasClaimedRef = useRef(false);

  useEffect(() => {
    if (hasClaimedRef.current) {
      return;
    }

    hasClaimedRef.current = true;

    async function claimReward() {
      if (!token) {
        setErrorMessage("This reward link is invalid.");
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

        const data = (await response.json().catch(() => null)) as
          | RewardResponse
          | null;

        if (!response.ok) {
          const nextError = getFriendlyErrorMessage(data?.error, response.status);
          setErrorMessage(nextError);
          setNeedsSignIn(response.status === 401);
          return;
        }

        const updatedCoins =
          typeof data?.coins === "number" ? data.coins : null;

        setSuccessMessage(
          data?.message ?? "Reward claimed successfully.",
        );
        setClaimedCoins(1);
        setBalance(updatedCoins);
        setNeedsSignIn(false);
      } catch (error) {
        console.error("SecretPageClient claimReward error:", error);
        setErrorMessage("We couldn’t claim this reward right now.");
      } finally {
        setIsLoading(false);
      }
    }

    void claimReward();
  }, [token]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 text-slate-100">
        <div className="flex min-h-screen w-full items-center justify-center">
          <div className="flex flex-col items-center gap-4 rounded-3xl border border-white/10 bg-slate-950/80 px-8 py-10 shadow-glow backdrop-blur">
            <Spinner />
            <p className="text-sm uppercase tracking-[0.35em] text-cyan-200/80">
              Claiming reward
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (errorMessage) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100">
        <section className="w-full max-w-md rounded-3xl border border-rose-500/30 bg-rose-500/10 px-6 py-8 text-center shadow-glow backdrop-blur smooth-transition sm:px-8">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-200" />
          <h1 className="mt-4 text-2xl font-semibold text-rose-100">
            Reward claim failed
          </h1>
          <p className="mt-2 text-sm leading-6 text-rose-100/80">
            {errorMessage}
          </p>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 font-medium text-white smooth-transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to store
            </button>

            {needsSignIn ? (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 font-semibold text-white shadow-glow smooth-transition hover:brightness-110"
              >
                <LogIn className="h-4 w-4" />
                Sign in
              </button>
            ) : null}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100">
      <section className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/80 p-6 text-center shadow-glow backdrop-blur smooth-transition sm:p-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-emerald-200/80">
          <Sparkles className="h-4 w-4" />
          Reward Claimed
        </div>

        <div className="mt-6 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-6 sm:px-6 sm:py-8">
          <BadgeCheck className="mx-auto h-10 w-10 text-emerald-300" />
          <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
            Reward claimed successfully
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-200">
            {successMessage || "Your reward has been added to your account."}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Reward
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                +{claimedCoins ?? 1} coin{(claimedCoins ?? 1) > 1 ? "s" : ""}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left">
              <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                Current balance
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {balance === null ? "Updated in your account" : `${balance} coins`}
              </p>
            </div>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-300">
          You can continue to the store now. Your balance is already updated.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 font-semibold text-white shadow-glow smooth-transition hover:brightness-110"
          >
            <ArrowLeft className="h-4 w-4" />
            Go to store
          </button>

          <button
            type="button"
            onClick={() => router.push("/login")}
            className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 font-medium text-white smooth-transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
          >
            <LogIn className="h-4 w-4" />
            Account
          </button>
        </div>
      </section>
    </main>
  );
}
