"use client";

import { useFormState, useFormStatus } from "react-dom";
import { login, type AuthFormState } from "@/lib/authActions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

export function LoginForm() {
  const [state, action] = useFormState<AuthFormState, FormData>(login, { error: null });
  return (
    <form action={action} className="space-y-3">
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-muted">Password</span>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-negative/10 px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
