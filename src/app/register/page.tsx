"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { pb, syncBrowserAuthCookie } from "../../lib/pocketbase";

function generateUsernameFromEmail(email: string) {
  const emailPrefix = email.split("@")[0] ?? "";
  const slug = emailPrefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const baseUsername = (slug || "user").slice(0, 15);
  const suffix = Math.random().toString(36).slice(2, 6);

  return `${baseUsername}-${suffix}`;
}

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
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
    if (!trimmedEmail || !password || !passwordConfirm) {
      setErrorMessage("Please complete all fields to create your account.");
      return;
    }

    if (password !== passwordConfirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    const username = generateUsernameFromEmail(trimmedEmail);

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await pb.collection("users").create({
        email: trimmedEmail,
        username,
        password,
        passwordConfirm,
      });

      await pb.collection("users").authWithPassword(trimmedEmail, password);
      syncBrowserAuthCookie();
      router.replace("/");
    } catch (error) {
      console.error("RegisterPage handleSubmit error:", error);
      setErrorMessage(
        "We couldn’t create your account. Please try a different email.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100 sm:px-6">
      <section className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 px-6 py-8 shadow-glow backdrop-blur smooth-transition sm:px-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-xs uppercase tracking-[0.35em] text-violet-200/80">
            <ShieldCheck className="h-4 w-4" />
            Create Account
          </div>

          <h1 className="mt-5 text-3xl font-semibold text-white">
            Create your account
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Register to claim reward links, collect coins, and keep your balance in sync.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-xs leading-5 text-slate-300">
            <Sparkles className="h-4 w-4 shrink-0 text-violet-300" />
            You’ll need an account before reward links can be claimed.
          </div>
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
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none smooth-transition placeholder:text-slate-400 focus:border-cyan-400/60 focus:bg-white/10"
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
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none smooth-transition placeholder:text-slate-400 focus:border-violet-400/60 focus:bg-white/10"
              placeholder="Create a password"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="passwordConfirm"
              className="text-sm font-medium text-slate-200"
            >
              Confirm password
            </label>
            <input
              id="passwordConfirm"
              type="password"
              autoComplete="new-password"
              value={passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
              className="min-h-14 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-white outline-none smooth-transition placeholder:text-slate-400 focus:border-violet-400/60 focus:bg-white/10"
              placeholder="Confirm your password"
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
            className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-violet-500 px-5 font-semibold text-white shadow-glow smooth-transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-300">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-cyan-300 smooth-transition hover:text-cyan-200"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
