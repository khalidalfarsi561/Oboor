"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Gift,
  LogOut,
  PackageOpen,
  Sparkles,
  Star,
} from "lucide-react";
import { pb } from "../lib/pocketbase";
import EmptyState from "../components/EmptyState";
import useSound from "../hooks/useSound";
import { products, type Product } from "../lib/products";

type RedeemResponse =
  | { message: string; coins: number }
  | { error: string };

function toastClass(type: "success" | "error") {
  return [
    "rounded-2xl border px-4 py-3 text-sm shadow-glow backdrop-blur-md smooth-transition",
    type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : "border-rose-500/30 bg-rose-500/10 text-rose-100",
  ].join(" ");
}

function getEmptyBalanceMessage(balance: number) {
  if (balance > 0) {
    return "You have coins ready to spend in the store.";
  }

  return "You have 0 coins right now. Claim a reward link to start collecting coins.";
}

export default function HomePageClient() {
  const router = useRouter();

  const [coinBalance, setCoinBalance] = useState(0);
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const playSuccessSound = useSound();

  useEffect(() => {
    if (!pb.authStore.isValid) {
      router.replace("/login");
      return;
    }

    let isMounted = true;

    async function loadCoinBalance() {
      const userId = pb.authStore.model?.id;

      if (!userId) {
        if (isMounted) {
          router.replace("/login");
        }

        return;
      }

      try {
        const user = await pb.collection("users").getOne(userId, {
          requestKey: null,
        });

        if (!isMounted) {
          return;
        }

        setCoinBalance(typeof user.coins === "number" ? user.coins : 0);
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "isAbort" in error &&
          (error as { isAbort?: boolean }).isAbort
        ) {
          return;
        }

        console.error("HomePageClient loadCoinBalance error:", error);
        if (!isMounted) {
          return;
        }

        setToast({
          type: "error",
          message: "We couldn’t load your balance right now.",
        });
      } finally {
        if (isMounted) {
          setIsLoadingBalance(false);
        }
      }
    }

    void loadCoinBalance();

    return () => {
      isMounted = false;
    };
  }, [router]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3600);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const sessionLabel = useMemo(() => {
    return pb.authStore.isValid ? "Signed in" : "Guest mode";
  }, []);

  async function handleLogout() {
    pb.authStore.clear();
    router.replace("/login");
  }

  async function handleRedeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setToast({ type: "error", message: "Enter a reward code to continue." });
      return;
    }

    if (!pb.authStore.isValid) {
      setToast({
        type: "error",
        message: "Please sign in to continue.",
      });
      router.replace("/login");
      return;
    }

    setIsRedeeming(true);
    setToast(null);

    try {
      const response = await fetch("/api/redeem-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: trimmedCode,
        }),
      });

      const data = (await response.json().catch(() => null)) as RedeemResponse | null;

      if (!response.ok) {
        const errorMessage =
          data && "error" in data ? data.error : "We couldn’t redeem that code.";
        setToast({ type: "error", message: errorMessage });
        if (response.status === 401) {
          router.replace("/login");
        }
        return;
      }

      if (data && "coins" in data) {
        setCoinBalance(data.coins);
      }

      void playSuccessSound();

      setCode("");
      setToast({
        type: "success",
        message: data && "message" in data ? data.message : "Reward redeemed successfully.",
      });
    } catch (error) {
      console.error("HomePageClient handleRedeem error:", error);
      setToast({
        type: "error",
        message: "Network error. Please try again.",
      });
    } finally {
      setIsRedeeming(false);
    }
  }

  function handleBuy(product: Product) {
    setToast({
      type: "success",
      message: `${product.name} is a preview item for now. More rewards are coming soon.`,
    });
  }

  const hasProducts = products.length > 0;

  return (
    <main className="min-h-screen px-4 py-4 text-slate-100 sm:px-6 sm:py-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="sticky top-4 z-40 rounded-3xl border border-white/10 bg-slate-950/55 p-5 shadow-glow backdrop-blur-md smooth-transition sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                <Star className="h-4 w-4" />
                Neon Rewards Store
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Spend coins on preview rewards, or claim more with a reward link.
              </h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                {sessionLabel} · Your balance updates instantly when you claim a reward.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:items-end">
              <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-5 py-4 text-right">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                  <Coins className="h-4 w-4" />
                  Coin Balance
                </p>
                <p className="mt-1 text-3xl font-bold text-white">
                  {isLoadingBalance ? "..." : coinBalance}
                </p>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 font-medium text-white transition-all duration-200 hover:border-rose-400/40 hover:bg-rose-400/10 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {toast ? (
          <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 sm:left-auto sm:right-6 sm:w-auto sm:max-w-sm sm:translate-x-0">
            <div className={toastClass(toast.type)}>{toast.message}</div>
          </div>
        ) : null}

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-glow">
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-violet-200/80">
                  <Gift className="h-4 w-4" />
                  How it works
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">
                  Claim rewards in a few simple steps
                </h2>

                <ol className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                  <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    1. Sign in to your account.
                  </li>
                  <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    2. Open a valid reward link from <span className="text-slate-100">/secret?token=...</span>.
                  </li>
                  <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    3. Claim the reward directly and see your balance update.
                  </li>
                  <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    4. Spend coins on preview items in the store.
                  </li>
                </ol>
              </article>

              <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-glow">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-emerald-200/80">
                  <BadgeCheck className="h-4 w-4" />
                  Balance
                </div>
                <h2 className="mt-4 text-2xl font-semibold text-white">
                  {isLoadingBalance ? "Loading your balance..." : `${coinBalance} coins available`}
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  {getEmptyBalanceMessage(coinBalance)}
                </p>

                <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    What coins do
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-200">
                    Coins are used to preview items in the store. The catalog is intentionally lightweight, but the balance and claiming flow are real.
                  </p>
                </div>
              </article>
            </div>

            <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-glow">
              <div className="mb-5">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-violet-300/80">
                  <Sparkles className="h-4 w-4" />
                  Activity
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Recent reward activity
                </h2>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-5 text-sm leading-6 text-slate-300">
                Your recent reward activity will appear here in a future update.
              </div>
            </article>
          </div>

          <div className="space-y-6">
            <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-glow">
              <div className="mb-5">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-cyan-300/80">
                  <PackageOpen className="h-4 w-4" />
                  Quick redeem
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Redeem a code
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  This is kept for compatibility, but reward links now claim directly from the secret page.
                </p>
              </div>

              <form onSubmit={handleRedeem} className="space-y-4">
                <div className="rounded-3xl border border-white/10 bg-white/5 p-3 smooth-transition focus-within:ring-2 focus-within:ring-cyan-500/50">
                  <input
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    placeholder="Enter reward code"
                    className="min-h-14 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 text-base text-white outline-none ring-0 smooth-transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white/10"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isRedeeming}
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] hover:brightness-110 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <ArrowRight className="h-4 w-4" />
                  {isRedeeming ? "Redeeming..." : "Redeem"}
                </button>
              </form>
            </article>

            <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-glow">
              <div className="mb-5">
                <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                  <Star className="h-4 w-4" />
                  Store / Products
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-white">
                  Featured digital items
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  These are preview items with a calmer presentation while the store grows.
                </p>
              </div>

              {hasProducts ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-1">
                  {products.map((product) => (
                    <article
                      key={product.id}
                      className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-glow transition-all duration-200 hover:-translate-y-1 hover:border-cyan-400/30 hover:bg-white/[0.07] hover:shadow-cyan-500/10"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                            <PackageOpen className="h-4 w-4" />
                            Preview item
                          </div>
                          <h3 className="mt-3 text-lg font-semibold text-white">
                            {product.name}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-300">
                            {product.description}
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-sm font-medium text-amber-200">
                          <Coins className="h-4 w-4" />
                          {product.price} Coins
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBuy(product)}
                        className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 font-medium text-white transition-all duration-200 hover:border-violet-400/40 hover:bg-violet-400/10 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95"
                      >
                        <Star className="h-4 w-4" />
                        Preview only
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState
                  title="No preview items yet"
                  description="The store is still warming up. New preview rewards will appear here as soon as the catalog is populated."
                  action={
                    <button
                      type="button"
                      onClick={() => router.push("/secret")}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 font-semibold text-white transition-all duration-200 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] active:scale-95"
                    >
                      <Sparkles className="h-4 w-4" />
                      Check reward links
                    </button>
                  }
                />
              )}
            </article>
          </div>
        </section>
      </div>
    </main>
  );
}
