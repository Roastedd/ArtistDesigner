"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}
import { signInAction, signUpAction, gitHubSignInAction } from "./actions";
import type { AuthState } from "./actions";

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-300"
    >
      <svg
        viewBox="0 0 16 16"
        className="mt-0.5 h-4 w-4 shrink-0 fill-current"
        aria-hidden="true"
      >
        <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1Zm-.75 4a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-1.5 0V5Zm.75 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z" />
      </svg>
      {message}
    </div>
  );
}

function PasswordField({
  id,
  name,
  label,
  autoComplete,
  placeholder,
  minLength,
}: {
  id: string;
  name: string;
  label: string;
  autoComplete: string;
  placeholder?: string;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="label block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          required
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className="input pr-10"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-fg)]"
        >
          {visible ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </button>
      </div>
    </div>
  );
}

function SignInForm({ onSwitch }: { onSwitch: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signInAction,
    null,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <ErrorBanner message={state.error} />}

      <div className="space-y-1">
        <label htmlFor="signin-email" className="label block">
          Email
        </label>
        <input
          id="signin-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="input"
        />
      </div>

      <PasswordField
        id="signin-password"
        name="password"
        label="Password"
        autoComplete="current-password"
        placeholder="Your password"
      />

      <button
        type="submit"
        disabled={pending}
        className="btn w-full justify-center gap-2"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>

      <p className="text-center text-sm text-[color:var(--color-muted)]">
        No account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-[color:var(--color-accent)] underline-offset-2 hover:underline"
        >
          Create one
        </button>
      </p>
    </form>
  );
}

function SignUpForm({ onSwitch }: { onSwitch: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signUpAction,
    null,
  );

  return (
    <form action={action} className="space-y-4" noValidate>
      {state?.error && <ErrorBanner message={state.error} />}

      <div className="space-y-1">
        <label htmlFor="signup-name" className="label block">
          Name{" "}
          <span className="normal-case font-normal text-[color:var(--color-muted)]">
            (optional)
          </span>
        </label>
        <input
          id="signup-name"
          name="name"
          type="text"
          autoComplete="name"
          placeholder="Your name"
          className="input"
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="signup-email" className="label block">
          Email
        </label>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="input"
        />
      </div>

      <PasswordField
        id="signup-password"
        name="password"
        label="Password"
        autoComplete="new-password"
        placeholder="At least 8 characters"
        minLength={8}
      />

      <PasswordField
        id="signup-confirm"
        name="confirm"
        label="Confirm password"
        autoComplete="new-password"
        placeholder="Repeat your password"
      />

      <button
        type="submit"
        disabled={pending}
        className="btn w-full justify-center gap-2"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </button>

      <p className="text-center text-sm text-[color:var(--color-muted)]">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-medium text-[color:var(--color-accent)] underline-offset-2 hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}

export function SignInCard({
  initialTab,
  hasGitHub,
}: {
  initialTab: "signin" | "signup";
  hasGitHub: boolean;
}) {
  const [tab, setTab] = useState<"signin" | "signup">(initialTab);

  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Tab switcher */}
      <div
        className="flex rounded-lg border border-[color:var(--color-border)] p-1 text-sm font-medium"
        role="tablist"
      >
        <button
          role="tab"
          aria-selected={tab === "signin"}
          onClick={() => setTab("signin")}
          className={`flex-1 rounded-md px-4 py-2 transition-colors ${
            tab === "signin"
              ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
              : "text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          }`}
        >
          Sign in
        </button>
        <button
          role="tab"
          aria-selected={tab === "signup"}
          onClick={() => setTab("signup")}
          className={`flex-1 rounded-md px-4 py-2 transition-colors ${
            tab === "signup"
              ? "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)]"
              : "text-[color:var(--color-muted)] hover:text-[color:var(--color-fg)]"
          }`}
        >
          Create account
        </button>
      </div>

      {/* Form panel */}
      <div className="card">
        {tab === "signin" ? (
          <SignInForm onSwitch={() => setTab("signup")} />
        ) : (
          <SignUpForm onSwitch={() => setTab("signin")} />
        )}
      </div>

      {/* GitHub SSO */}
      {hasGitHub && (
        <>
          <div className="flex items-center gap-3 text-xs text-[color:var(--color-muted)]">
            <div className="h-px flex-1 bg-[color:var(--color-border)]" />
            <span>or continue with</span>
            <div className="h-px flex-1 bg-[color:var(--color-border)]" />
          </div>
          <form action={gitHubSignInAction}>
            <button
              type="submit"
              className="btn-ghost btn w-full justify-center gap-2"
            >
              <GitHubIcon className="h-4 w-4" />
              GitHub
            </button>
          </form>
        </>
      )}
    </div>
  );
}
