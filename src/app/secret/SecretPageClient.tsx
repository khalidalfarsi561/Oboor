"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import confetti from "canvas-confetti";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  LogIn,
  Sparkles,
  ShieldAlert,
  Sparkles as SparklesIcon,
} from "lucide-react";
import { claimReward } from "../../lib/services/rewardService";

type ClaimPhase = "loading" | "claiming" | "success" | "error";

function ClaimSkeleton() {
  return (
    <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-glow backdrop-blur-md sm:p-8">
      <div className="mb-6 h-8 w-40 rounded-full bg-white/10" />
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5 sm:p-6">
        <div className="mx-auto h-12 w-12 rounded-full bg-cyan-400/15" />
        <div className="mx-auto mt-6 h-9 w-72 max-w-full rounded-2xl bg-white/10" />
        <div className="mx-auto mt-4 h-4 w-96 max-w-full rounded-full bg-white/10" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="h-24 rounded-2xl bg-white/5" />
          <div className="h-24 rounded-2xl bg-white/5" />
        </div>
        <div className="mt-6 h-14 rounded-2xl bg-white/10" />
      </div>
    </div>
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

function vibrateClaim() {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate([10, 30, 10]);
  }
}

export default function SecretPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [phase, setPhase] = useState<ClaimPhase>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [claimedCoins, setClaimedCoins] = useState<number | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [needsSignIn, setNeedsSignIn] = useState(false);
  const [shakeNonce, setShakeNonce] = useState(0);
  const hasClaimedRef = useRef(false);

  useEffect(() => {
    if (hasClaimedRef.current) {
      return;
    }

    hasClaimedRef.current = true;

    async function startClaim() {
      if (!token) {
        setErrorMessage("This reward link is invalid.");
        setNeedsSignIn(false);
        setPhase("error");
        setShakeNonce((value) => value + 1);
        return;
      }

      setPhase("claiming");

      const result = await claimReward(token);

      if (!result.ok) {
        const friendlyError = getFriendlyErrorMessage(result.error, result.status);
        setErrorMessage(friendlyError);
        setNeedsSignIn(result.needsSignIn);
        setPhase("error");
        setShakeNonce((value) => value + 1);
        return;
      }

      setSuccessMessage(result.message);
      setClaimedCoins(result.coins > 0 ? result.coins : 1);
      setBalance(result.coins);
      setNeedsSignIn(false);
      setPhase("success");

      confetti({
        particleCount: 120,
        spread: 90,
        startVelocity: 34,
        origin: { x: 0.5, y: 0.42 },
        colors: ["#67e8f9", "#22d3ee", "#a855f7", "#34d399", "#ffffff"],
      });
    }

    void startClaim();
  }, [token]);

  function handlePrimaryAction() {
    vibrateClaim();

    if (phase === "error" && needsSignIn) {
      router.push("/login");
      return;
    }

    if (phase === "error") {
      setPhase("loading");
      setShakeNonce((value) => value + 1);
      hasClaimedRef.current = false;
      return;
    }

    router.push("/");
  }

  const isClaiming = phase === "claiming";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100">
      <AnimatePresence mode="wait">
        {phase === "loading" || phase === "claiming" ? (
          <motion.section
            key="loading"
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className={`w-full max-w-2xl ${isClaiming ? "animate-pulse" : ""}`}
          >
            <ClaimSkeleton />
          </motion.section>
        ) : null}

        {phase === "error" ? (
          <motion.section
            key={`error-${shakeNonce}`}
            initial={{ opacity: 0, scale: 0.98, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full max-w-2xl"
          >
            <div className="animate-shake rounded-3xl border border-rose-500/30 bg-rose-500/10 p-6 text-center shadow-glow backdrop-blur-md sm:p-8">
              <ShieldAlert className="mx-auto h-12 w-12 text-rose-200" />
              <h1 className="mt-4 text-2xl font-semibold text-rose-100">
                Reward claim failed
              </h1>
              <p className="mt-3 text-sm leading-6 text-rose-100/80">
                {errorMessage}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 font-medium text-white transition-all duration-200 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to store
                </button>

                {needsSignIn ? (
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95"
                  >
                    <SparklesIcon className="h-4 w-4" />
                    Try again
                  </button>
                )}
              </div>
            </div>
          </motion.section>
        ) : null}

        {phase === "success" ? (
          <motion.section
            key="success"
            initial={{ opacity: 0, scale: 0.94, y: 22 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="w-full max-w-2xl"
          >
            <div className="rounded-3xl border border-emerald-400/25 bg-emerald-400/10 p-6 text-center shadow-glow backdrop-blur-md sm:p-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-emerald-300/30 bg-emerald-300/10 shadow-[0_0_30px_rgba(74,222,128,0.35)]">
                <BadgeCheck className="h-11 w-11 text-emerald-300" />
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-emerald-200/80">
                <Sparkles className="h-4 w-4" />
                Reward Unlocked
              </div>

              <h1 className="mt-5 text-3xl font-semibold text-white sm:text-4xl">
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

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => router.push("/")}
                  className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-6 font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to store
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className="inline-flex min-h-14 flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 font-medium text-white transition-all duration-200 hover:border-cyan-400/40 hover:bg-cyan-400/10 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95"
                >
                  <LogIn className="h-4 w-4" />
                  Account
                </button>
              </div>
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
    </main>
  );
}
