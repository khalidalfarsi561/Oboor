"use client";

import type { ReactNode } from "react";
import { PackageOpen } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-center shadow-glow backdrop-blur-md sm:p-8">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-400/10">
        <PackageOpen className="h-8 w-8 text-cyan-200" />
      </div>

      <h3 className="mt-4 text-2xl font-semibold text-white">{title}</h3>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-300">
        {description}
      </p>

      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}
