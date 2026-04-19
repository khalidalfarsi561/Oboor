"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import {
  loadBrowserAuthCookie,
  pb,
  syncBrowserAuthCookie,
} from "../lib/pocketbase";

const publicRoutes = new Set(["/login", "/register", "/secret"]);

function AuthGateSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="min-h-screen w-full bg-slate-950 text-slate-50"
    >
      <div className="flex min-h-screen w-full items-center justify-center px-4">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-glow backdrop-blur">
          <div className="space-y-4">
            <div className="h-4 w-32 rounded-full bg-white/5" />
            <div className="h-10 w-full rounded-2xl bg-white/5" />
            <div className="h-10 w-5/6 rounded-2xl bg-white/5" />
            <div className="h-12 w-full rounded-2xl bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isHydrated, setIsHydrated] = useState(false);
  const [authVersion, setAuthVersion] = useState(0);

  useEffect(() => {
    loadBrowserAuthCookie();
    setIsHydrated(true);

    const unsubscribe = pb.authStore.onChange(() => {
      syncBrowserAuthCookie();
      setAuthVersion((version) => version + 1);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    const isPublicRoute = publicRoutes.has(pathname);

    if (!pb.authStore.isValid && !isPublicRoute && pathname !== "/login") {
      router.replace("/login");
      return;
    }

    if (
      pb.authStore.isValid &&
      (pathname === "/login" || pathname === "/register")
    ) {
      router.replace("/");
    }
  }, [authVersion, isHydrated, pathname, router]);

  if (!isHydrated) {
    return <AuthGateSkeleton />;
  }

  return <>{children}</>;
}
