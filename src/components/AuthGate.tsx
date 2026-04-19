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
    return null;
  }

  return <>{children}</>;
}
