"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Coins,
  Gift,
  LogOut,
  PackageOpen,
  Star,
  ClipboardPaste,
} from "lucide-react";
import { pb } from "../lib/pocketbase";
import { products, type Product } from "../lib/products";

type RedeemResponse = { message: string; coins: number } | { error: string };

function toastClass(type: "success" | "error") {
  return [
    "rounded-2xl border px-4 py-3 text-sm shadow-glow backdrop-blur",
    type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
      : "border-rose-500/30 bg-rose-500/10 text-rose-100",
  ].join(" ");
}

export default function HomePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [coinBalance, setCoinBalance] = useState(0);
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);

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
        const user = await pb.collection("users").getOne(userId);

        if (!isMounted) {
          return;
        }

        setCoinBalance(typeof user.coins === "number" ? user.coins : 0);
      } catch (error) {
        console.error("HomePageClient loadCoinBalance error:", error);
        if (!isMounted) {
          return;
        }

        setToast({
          type: "error",
          message: "Could not load your coin balance.",
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
    if (searchParams.get("copied") !== "true") {
      return;
    }

    setToast({
      type: "success",
      message: "Code copied successfully! Paste it below to claim your coin.",
    });

    router.replace("/");
  }, [router, searchParams]);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3200);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const sessionLabel = useMemo(() => {
    return pb.authStore.isValid ? "Logged in" : "Guest mode";
  }, []);

  async function handleLogout() {
    pb.authStore.clear();
    router.replace("/login");
  }

  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText();
      setCode(text.trim());
      setToast({ type: "success", message: "Code pasted from clipboard." });
    } catch (error) {
      console.error("HomePageClient handlePaste error:", error);
      setToast({
        type: "error",
        message: "Clipboard access failed. Paste manually.",
      });
    }
  }

  async function handleRedeem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedCode = code.trim();
    if (!trimmedCode) {
      setToast({ type: "error", message: "Enter a code before redeeming." });
      return;
    }

    if (!pb.authStore.isValid) {
      setToast({
        type: "error",
        message: "Session unavailable for redemption.",
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

      const data = (await response.json()) as RedeemResponse;

      if (!response.ok) {
        const errorMessage =
          "error" in data ? data.error : "Failed to redeem code.";
        setToast({ type: "error", message: errorMessage });
        if (response.status === 401) {
          router.replace("/login");
        }
        return;
      }

      if ("coins" in data) {
        setCoinBalance(data.coins);
      }

      setCode("");
      setToast({
        type: "success",
        message:
          "message" in data ? data.message : "Code redeemed successfully.",
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
      type: "error",
      message: `${product.name} is shown for demo purposes only.`,
    });
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-glow backdrop-blur">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-cyan-200/80">
                <Star className="h-4 w-4" />
                Neon Rewards Store
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">
                Spend coins, unlock digital loot.
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                {sessionLabel} · Redeem reward codes, track your balance, and
                browse the mock store.
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
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 font-medium text-white transition hover:border-rose-400/40 hover:bg-rose-400/10"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </header>

        {toast ? (
          <div className={toastClass(toast.type)}>{toast.message}</div>
        ) : null}

        <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-glow">
            <div className="mb-5">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-violet-300/80">
                <Gift className="h-4 w-4" />
                Code Redemption
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Redeem a reward code instantly
              </h2>
            </div>

            <form onSubmit={handleRedeem} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="Enter reward code"
                  className="min-h-14 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 text-base text-white outline-none ring-0 transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white/10"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 font-medium text-white transition hover:border-cyan-400/50 hover:bg-cyan-400/10"
                >
                  <ClipboardPaste className="h-4 w-4" />
                  Paste
                </button>
              </div>

              <button
                type="submit"
                disabled={isRedeeming}
                className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <PackageOpen className="h-4 w-4" />
                {isRedeeming ? "Redeeming..." : "Redeem"}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-glow">
            <div className="mb-5">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-emerald-300/80">
                <Star className="h-4 w-4" />
                Store / Products
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-white">
                Featured digital items
              </h2>
            </div>

            <div className="grid gap-4">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5 transition hover:border-cyan-400/30 hover:bg-white/7"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.25em] text-cyan-200/80">
                        <PackageOpen className="h-4 w-4" />
                        Reward
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-white">
                        {product.name}
                      </h3>
                      <p className="mt-1 text-sm text-slate-300">
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
                    className="mt-4 inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 font-medium text-white opacity-70 transition hover:border-violet-400/40 hover:bg-violet-400/10"
                  >
                    <Star className="h-4 w-4" />
                    Demo Only
                  </button>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
