"use client";

import { useFormState, useFormStatus } from "react-dom";
import { joinHousehold } from "@/lib/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-accent px-4 py-2.5 text-sm font-semibold text-accent transition-colors hover:bg-accent-soft disabled:opacity-60"
    >
      {pending ? "Joining…" : "Join household"}
    </button>
  );
}

export function JoinForm() {
  const [state, action] = useFormState(joinHousehold, { error: null });
  return (
    <form action={action} className="space-y-3">
      <input
        name="code"
        required
        placeholder="8-character code, e.g. KM3P7XQ2"
        aria-label="Invite code"
        className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-mono text-sm uppercase tracking-widest outline-none focus:ring-2 focus:ring-accent"
      />
      {state.error && (
        <p role="alert" className="rounded-xl bg-negative/10 px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      <SubmitButton />
    </form>
  );
}
