"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { pb } from "../lib/pocketbase";

const publicRoutes = new Set(["/login", "/register", "/secret"]);

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const isPublicRoute = publicRoutes.has(pathname);

    if (!pb.authStore.isValid && !isPublicRoute) {
      router.replace("/login");
      return;
    }

    if (pb.authStore.isValid && (pathname === "/login" || pathname === "/register")) {
      router.replace("/");
    }
  }, [pathname, router]);

  return <>{children}</>;
}
