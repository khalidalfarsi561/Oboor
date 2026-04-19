"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { pb, syncBrowserAuthCookie } from "../../lib/pocketbase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (pb.authStore.isValid) {
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setErrorMessage("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await pb.collection("users").authWithPassword(trimmedEmail, password);
      syncBrowserAuthCookie();
      router.replace("/");
    } catch (error) {
      console.error("LoginPage handleSubmit error:", error);
      setErrorMessage("Invalid email or password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-glow backdrop-blur">
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
            Neon Rewards
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-white">
            Sign in to continue
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            Access your reward balance and redeem codes securely.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-200"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white/10"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-200"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none transition placeholder:text-slate-400 focus:border-violet-400/60 focus:bg-white/10"
              placeholder="Enter your password"
            />
          </div>

          {errorMessage ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
              {errorMessage}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-14 w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          New here?{" "}
          <Link
            href="/register"
            className="text-cyan-300 transition hover:text-cyan-200"
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
