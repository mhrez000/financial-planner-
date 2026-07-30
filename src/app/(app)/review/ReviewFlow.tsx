"use client";

import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CalendarCheck, Check, PartyPopper } from "lucide-react";
import clsx from "clsx";
import { completeWeeklyReview } from "@/lib/actions";

export interface ReviewStep {
  title: string;
  emoji: string;
  intro: string;
  items: { text: string; tone: "positive" | "neutral" | "warning" }[];
}

/**
 * The Money Date: a guided ten-minute weekly ritual — wins, watch-outs,
 * plan — ending in a logged habit streak. The single highest-leverage habit
 * in personal finance, so Sage makes it a ceremony, not a chore.
 */
export function ReviewFlow({
  steps,
  alreadyDone,
  reviewCount,
}: {
  steps: ReviewStep[];
  alreadyDone: boolean;
  reviewCount: number;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const finish = () =>
    startTransition(async () => {
      await completeWeeklyReview();
      setDone(true);
    });

  if (done || (alreadyDone && stepIndex === 0 && !pending)) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-border bg-surface p-8 text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-white">
          {done ? <PartyPopper size={24} aria-hidden /> : <CalendarCheck size={24} aria-hidden />}
        </span>
        <h1 className="text-lg font-bold">
          {done ? "Money Date complete!" : "This week's review is done"}
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
          {done
            ? `That's ${reviewCount + 1} reviews logged. Ten minutes a week is the single most reliable predictor of hitting your goals — see you next week.`
            : "You've already sat down with your money this week. Come back after the weekend for the next one."}
        </p>
        {done && (
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            <Check size={13} aria-hidden /> Streak logged · +15 XP
          </p>
        )}
      </div>
    );
  }

  const step = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress */}
      <div className="mb-4 flex items-center gap-2" role="progressbar" aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={steps.length} aria-label="Review progress">
        {steps.map((s, i) => (
          <div
            key={s.title}
            className={clsx(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= stepIndex ? "bg-accent" : "bg-surface-2",
            )}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-surface p-6">
        <p className="text-2xl" aria-hidden>{step.emoji}</p>
        <h1 className="mt-2 text-lg font-bold tracking-tight">{step.title}</h1>
        <p className="mt-1 text-xs text-muted">{step.intro}</p>

        <ul className="mt-5 space-y-2.5">
          {step.items.map((item, i) => (
            <li
              key={i}
              className={clsx(
                "flex items-start gap-2.5 rounded-xl border p-3 text-sm leading-relaxed",
                item.tone === "positive" && "border-positive/30 bg-positive/5",
                item.tone === "warning" && "border-warning/30 bg-warning/5",
                item.tone === "neutral" && "border-border bg-surface-2/50",
              )}
            >
              <span
                className={clsx(
                  "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                  item.tone === "positive" && "bg-positive",
                  item.tone === "warning" && "bg-warning",
                  item.tone === "neutral" && "bg-faint",
                )}
                aria-hidden
              />
              {item.text}
            </li>
          ))}
          {step.items.length === 0 && (
            <li className="rounded-xl bg-surface-2 p-3 text-sm text-muted">Nothing here this week — clean slate.</li>
          )}
        </ul>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
            disabled={stepIndex === 0}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted disabled:opacity-40"
          >
            <ArrowLeft size={13} aria-hidden /> Back
          </button>
          {isLast ? (
            <button
              type="button"
              onClick={finish}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <Check size={14} aria-hidden /> {pending ? "Logging…" : "Complete Money Date"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStepIndex((i) => i + 1)}
              className="flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Next <ArrowRight size={13} aria-hidden />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
