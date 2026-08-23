/**
 * Savings-challenge engine. A challenge is a time-boxed rule evaluated live
 * against transactions — no manual "I did it" honesty box, the ledger is the
 * referee. That's what makes the XP feel earned.
 */

import { differenceInCalendarDays } from "date-fns";
import { formatAUD } from "./money";

export type ChallengeType = "NO_SPEND_WEEK" | "COFFEE_CHALLENGE" | "WEEKEND_FREEZE" | "FIFTY_TWO_WEEK";

export interface ChallengeDef {
  type: ChallengeType;
  name: string;
  description: string;
  durationDays: number;
  xp: number;
}

export const CHALLENGE_DEFS: ChallengeDef[] = [
  {
    type: "NO_SPEND_WEEK",
    name: "No Spend Week",
    description: "Seven days with zero lifestyle spending — essentials are fine.",
    durationDays: 7,
    xp: 300,
  },
  {
    type: "COFFEE_CHALLENGE",
    name: "Coffee Challenge",
    description: "Spend at most half of your usual coffee money over 30 days.",
    durationDays: 30,
    xp: 200,
  },
  {
    type: "WEEKEND_FREEZE",
    name: "Weekend Spending Freeze",
    description: "One weekend, zero discretionary spending. Harder than it sounds.",
    durationDays: 7,
    xp: 150,
  },
  {
    type: "FIFTY_TWO_WEEK",
    name: "52 Week Challenge",
    description: "Save $1 in week 1, $2 in week 2… $1,378 by the end.",
    durationDays: 364,
    xp: 500,
  },
];

export interface ChallengeTxn {
  date: Date;
  amountCents: number;
  categoryName: string | null;
  categoryGroup: string | null;
}

export interface ChallengeState {
  /** 0–1 share of the challenge window elapsed. */
  timeFraction: number;
  /** Still passing the rule? */
  passing: boolean;
  /** Window over AND passing. */
  succeeded: boolean;
  /** Rule already broken (unrecoverable) or window over while failing. */
  failed: boolean;
  detail: string;
}

export function evaluateChallenge(
  type: ChallengeType,
  window: { start: Date; end: Date; targetCents: number | null },
  txns: ChallengeTxn[],
  now: Date,
): ChallengeState {
  const inWindow = txns.filter((t) => t.date >= window.start && t.date <= window.end && t.amountCents < 0);
  const total = Math.max(1, differenceInCalendarDays(window.end, window.start));
  const timeFraction = Math.min(1, Math.max(0, differenceInCalendarDays(now, window.start) / total));
  const over = now > window.end;

  const spend = (list: ChallengeTxn[]) => list.reduce((a, t) => a + Math.abs(t.amountCents), 0);

  let passing: boolean;
  let detail: string;

  switch (type) {
    case "NO_SPEND_WEEK": {
      const lifestyle = inWindow.filter((t) => t.categoryGroup === "LIFESTYLE");
      passing = lifestyle.length === 0;
      detail = passing
        ? "No lifestyle spending yet — hold the line."
        : `${lifestyle.length} lifestyle purchase${lifestyle.length === 1 ? "" : "s"} (${formatAUD(spend(lifestyle))}) broke the streak.`;
      break;
    }
    case "COFFEE_CHALLENGE": {
      const coffee = spend(inWindow.filter((t) => t.categoryName === "Coffee"));
      const cap = window.targetCents ?? 0;
      passing = coffee <= cap;
      detail = `${formatAUD(coffee)} of your ${formatAUD(cap)} coffee cap used.`;
      break;
    }
    case "WEEKEND_FREEZE": {
      const weekend = inWindow.filter(
        (t) => [0, 6].includes(t.date.getDay()) && t.categoryGroup === "LIFESTYLE",
      );
      passing = weekend.length === 0;
      detail = passing
        ? "Weekend discretionary spending: $0. Beautiful."
        : `${formatAUD(spend(weekend))} of weekend spending broke the freeze.`;
      break;
    }
    case "FIFTY_TWO_WEEK": {
      const week = Math.min(52, Math.floor(differenceInCalendarDays(now > window.end ? window.end : now, window.start) / 7) + 1);
      const targetSoFar = ((week * (week + 1)) / 2) * 100; // $1+$2+…$n in cents
      const saved = spend(inWindow.filter((t) => t.categoryName === "Savings Transfer"));
      passing = saved >= targetSoFar;
      detail = `Week ${week}: ${formatAUD(saved)} saved vs ${formatAUD(targetSoFar)} scheduled.`;
      break;
    }
  }

  // Spend-cap rules are unrecoverable once broken (spend only grows);
  // the 52-week saving pace can be caught up, so it only fails at the end.
  const failed = over ? !passing : !passing && type !== "FIFTY_TWO_WEEK";
  return {
    timeFraction,
    passing,
    succeeded: over && passing,
    failed,
    detail,
  };
}
