/**
 * Smart predictions: end-of-month balance, goal completion dates and
 * success probability. Deliberately simple, explainable models — users trust
 * forecasts they can understand, and these run instantly on-device.
 */

import { addMonths, differenceInCalendarDays, endOfMonth, getDaysInMonth } from "date-fns";

export interface EomForecast {
  projectedBalanceCents: number;
  dailySpendRateCents: number;
  daysRemaining: number;
}

/**
 * Projects the end-of-month cash position from the month-to-date daily spend
 * rate and known upcoming bills.
 */
export function forecastEndOfMonth(
  currentCashCents: number,
  monthToDateSpendCents: number, // positive
  upcomingBillsCents: number, // positive, bills due before month end not yet paid
  expectedRemainingIncomeCents: number,
  now: Date,
): EomForecast {
  const dayOfMonth = now.getDate();
  const daysRemaining = differenceInCalendarDays(endOfMonth(now), now);
  const dailyRate = Math.round(monthToDateSpendCents / Math.max(dayOfMonth, 1));
  const projected =
    currentCashCents -
    dailyRate * daysRemaining -
    upcomingBillsCents +
    expectedRemainingIncomeCents;
  return { projectedBalanceCents: projected, dailySpendRateCents: dailyRate, daysRemaining };
}

export interface GoalForecast {
  monthsToTarget: number | null; // null = never at current rate
  predictedCompletion: Date | null;
  /** 0–1 probability of hitting the deadline at the current contribution. */
  successProbability: number;
  onTrack: boolean;
}

export function forecastGoal(
  targetCents: number,
  savedCents: number,
  monthlyContribCents: number,
  deadline: Date | null,
  now: Date,
): GoalForecast {
  const remaining = Math.max(0, targetCents - savedCents);
  if (remaining === 0) {
    return { monthsToTarget: 0, predictedCompletion: now, successProbability: 1, onTrack: true };
  }
  if (monthlyContribCents <= 0) {
    return { monthsToTarget: null, predictedCompletion: null, successProbability: 0, onTrack: false };
  }
  const months = Math.ceil(remaining / monthlyContribCents);
  const completion = addMonths(now, months);
  if (!deadline) {
    return { monthsToTarget: months, predictedCompletion: completion, successProbability: 0.9, onTrack: true };
  }
  const monthsAvailable =
    (deadline.getFullYear() - now.getFullYear()) * 12 + (deadline.getMonth() - now.getMonth());
  if (monthsAvailable <= 0) {
    return { monthsToTarget: months, predictedCompletion: completion, successProbability: 0, onTrack: false };
  }
  // Logistic curve over the slack ratio: 1.0 = exactly on time → ~73%,
  // finishing in 80% of the time → ~92%, needing 25% longer → ~27%.
  const slack = monthsAvailable / months;
  const successProbability = 1 / (1 + Math.exp(-8 * (slack - 0.88)));
  return {
    monthsToTarget: months,
    predictedCompletion: completion,
    successProbability: Math.round(successProbability * 100) / 100,
    onTrack: completion <= deadline,
  };
}

/** Pro-rata weekly slice of a monthly budget, minus this week's spend so far. */
export function weeklyBudgetRemaining(
  monthlyBudgetCents: number,
  weekToDateSpendCents: number,
  now: Date,
): number {
  const weeklyBudget = Math.round((monthlyBudgetCents / getDaysInMonth(now)) * 7);
  return weeklyBudget - weekToDateSpendCents;
}
