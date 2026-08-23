# Sage — Product Requirements Document

**Vision:** the app that changes what you *do* with money, not just what you *know* about it.

Most finance apps are rear-view mirrors: they tell you what you spent. Sage is a coach: it forms habits, celebrates progress, forecasts consequences, and makes the next good decision the easiest one. Success is measured in behaviour change — savings rate up, subscription waste down, debt-free dates pulled forward — not in sessions or screens viewed.

## 1. Competitive landscape & the gap

| Product | Strength | Weakness we exploit |
| --- | --- | --- |
| YNAB | Zero-based budgeting discipline | Steep learning curve, joyless, US-centric |
| Copilot Money | Beautiful, Apple-polished | iOS/US only, tracking-first not coaching-first |
| Monarch Money | Household features, planning | US-only banking, subscription fatigue, little behaviour design |
| Rocket Money | Subscription cancellation | Shallow elsewhere; dark-pattern upsells |
| PocketSmith | Calendar forecasting (NZ/AU) | Dated UX, overwhelming for beginners |
| WeMoney / Frollo | AU CDR connections | Thin insights; WeMoney leans on credit-score marketing |
| Mint (RIP) | Free aggregation | Ads-driven, abandoned — proof tracking alone isn't a business |
| Duolingo / Fitbit | Habit loops, streaks, celebration | Not finance |

**The gap:** nobody combines (a) genuine AU Open Banking coverage, (b) explainable coaching that says *what to do next*, and (c) habit mechanics that make doing it feel good. That intersection is Sage.

## 2. Personas

1. **Overwhelmed starter — "Jess", 26, retail manager.** Money disappears; four BNPL accounts; finds finance apps shame-y. Needs: zero-jargon setup, small wins, the Coffee Challenge, one clear number ("safe to spend").
2. **Progressing professional — "Alex", 33, analyst (seed-data persona).** Mortgage, some ETFs, decent income, suspects leakage. Needs: subscription audit, weekday-spend patterns, goal probability, health score to optimise.
3. **Family CFO — "Priya", 41, two kids.** Runs household money across joint accounts. Needs: shared budgets, bill calendar, partner visibility without surveillance, EOFY exports.
4. **Debt escaper — "Marcus", 37, tradie.** Car loan + two cards + HECS. Needs: snowball-vs-avalanche shown in dollars and dates, celebration at each payoff milestone.

## 3. Product principles

1. **Coach, don't judge.** Every insight pairs a fact with a doable action. Never shame; celebrate direction, not perfection.
2. **Explainable numbers.** Every score, forecast and probability can be tapped to reveal *why*. No black boxes with people's money.
3. **The next action is one tap.** Insight → "create Friday limit" button. Goal behind → "add $100 boost".
4. **Calm premium.** One accent colour, generous whitespace, soft motion. Finance apps shout; Sage doesn't.
5. **Privacy is the product.** Read-only CDR data, no selling data, no credit-score lead-gen, delete-everything button.

## 4. Feature specification (condensed)

### Core loop (daily, <30s)
Open → Health score + "how am I doing" stats → one coach insight → optional habit check-in → done. The dashboard answers *"How am I doing financially today?"* above the fold.

### Money in/out
- Transactions: auto-import (CDR), CSV import, manual entry, receipt photo/scan (Phase 3 OCR), split, tags, search.
- Categorisation: built-in AU merchant knowledge base → user rules (substring, priority, retro-apply) → ML fallback. Rename/merge/custom categories.
- Subscriptions: detected from amount+interval stability; true monthly/annual cost, next charge, price-rise alerts, unused-service flags.
- Bills: calendar, reminders, autopay status, late-fee warnings.

### Behaviour engine
- Financial Health Score /100: savings rate 25, emergency fund 20, debt load 20, budget adherence 15, cash flow 10, subscription load 10 — each with plain-English advice.
- Habits: streaks, XP, levels; savings challenges (No Spend Week, 52-Week, Coffee Challenge, Weekend Freeze).
- Insights: category momentum, day-of-week patterns, late-night spending, savings-rate feedback, subscription load — deterministic engine, LLM narration layer on top (Phase 3).

### Planning
- Budgets: category, envelope, zero-based, 50/30/20; weekly/fortnightly/monthly/annual; pro-rata pacing ("on track" vs "running hot").
- Goals: unlimited; target, deadline, contribution, predicted completion, success probability, milestones and celebrations.
- Debt: snowball vs avalanche simulation with payoff order, dates, interest saved; HECS-aware (indexation, no rush to prepay vs offset).
- Forecasts: month-end balance, goal completion, budget overrun risk.
- Net worth: all account classes incl. property estimates and super; growth timeline.

### Household (Phase 3+)
Multi-user with role-based visibility, shared budgets/goals, kids' allowance tracking, household reports.

### Reporting
Monthly/annual/cash-flow/category/net-worth reports; PDF/CSV/Excel export; Tax Centre: deductible tagging, receipts, EOFY export aligned to ATO categories.

## 5. Non-functional requirements

- **Performance:** dashboard TTI < 2s on 4G mid-range Android; all analytics computed server-side or on-device, never blocking first paint.
- **Accessibility:** WCAG 2.1 AA; full keyboard nav; screen-reader labels on every chart (data also available as text); reduced-motion support; colour-blind-safe encodings (never colour alone).
- **Reliability:** bank sync retries with jittered backoff; duplicate reconciliation idempotent.
- **Localisation:** AUD/en-AU first; currency, date and category packs per country later.

## 6. Success metrics

| Metric | Target (12 months post-launch) |
| --- | --- |
| Activation: connected bank or 10+ transactions in week 1 | ≥ 60% |
| W4 retention | ≥ 40% |
| Median savings rate uplift after 90 days | +3 pts |
| Users cancelling ≥1 detected subscription in month 1 | ≥ 25% |
| Health score improvement after 90 days | +8 median |
| NPS | ≥ 50 |
