"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createCategory } from "@/lib/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "Creating…" : "Create"}
    </button>
  );
}

export function CreateCategoryForm() {
  const [state, action] = useFormState(createCategory, { error: null });
  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder="e.g. Pets, Children, Side Hustle"
          aria-label="Category name"
          className="min-w-44 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <select name="group" aria-label="Category group" className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm">
          <option value="LIFESTYLE">Lifestyle</option>
          <option value="ESSENTIAL">Essential</option>
          <option value="INCOME">Income</option>
          <option value="FINANCIAL">Saving & investing</option>
        </select>
        <SubmitButton />
      </div>
      {state.error && (
        <p role="alert" className="rounded-xl bg-negative/10 px-3 py-2 text-xs text-negative">
          {state.error}
        </p>
      )}
      <p className="text-xs leading-relaxed text-faint">
        The group drives 50/30/20 rollups and the health score — pick where this spending truly
        belongs.
      </p>
    </form>
  );
}
