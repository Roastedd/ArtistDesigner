"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-16 text-center animate-fade-up">
      <div
        className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20"
        aria-hidden
      >
        <AlertTriangle className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold mb-2">Something went sideways</h1>
      <p className="text-sm text-[color:var(--color-muted)] mb-1">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-[10px] font-mono text-[color:var(--color-muted)]/70 mb-5">
          ref · {error.digest}
        </p>
      )}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button onClick={reset} className="btn gap-2">
          <RefreshCw className="h-4 w-4" />
          Try again
        </button>
        <Link href="/dashboard" className="btn-ghost btn gap-2">
          <Home className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
