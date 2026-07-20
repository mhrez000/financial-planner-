# Sage — Roadmap

## Phase 1 — Foundation ✅ (this repository)

- Competitor analysis, personas, PRD, architecture, design system (docs/)
- Database schema (Prisma, Postgres-portable) + deterministic AU seed
- Design system implemented as tokens + component vocabulary
- Dashboard, transactions (+ rules engine), budgets, goals, analytics, subscriptions, bills, net worth, debt planner, habits/gamification
- Domain engines with 21 unit tests; CI (typecheck, test, build)

## Phase 2 — Real accounts

- Auth.js: passkeys, TOTP, sessions, device management (swap `getDemoUser` → session user)
- CDR bank connections via Basiq/Frollo sandbox → production (consent UX, sync workers, webhook ingestion, dedupe/reconciliation)
- CSV import UI (same pipeline), receipt photo upload (storage + manual amount first)
- Postgres migration + RLS; Temporal/BullMQ workers; notification service (FCM/APNs) for bills due, budget exceeded, large purchase, salary received
- Playwright E2E suite

## Phase 3 — Intelligence & delight

- LLM coach (Claude) over the insight engine: conversational Q&A, "what should I do this payday?", affordability checks calling forecast engines as tools
- Receipt/invoice OCR → line-item extraction; smarter ML categorisation fallback
- Investment tracking (shares/ETF/crypto price feeds, dividends, allocation) and super tracking
- Goal milestones with celebrations; full challenge system with social opt-in leaderboards
- Reports + PDF/Excel/CSV export; Tax Centre (deduction tagging, EOFY export)
- Expo mobile apps sharing domain engines; widgets (health score, safe-to-spend)

## Phase 4 — Scale & hardening

- Household mode (roles, shared budgets/goals, kids' allowances, partner privacy controls)
- Performance: materialised aggregates, edge caching of static shell, <2s TTI on mid-range Android
- WCAG 2.1 AA audit with assistive-tech testing; security penetration test; SOC 2 groundwork
- App Store / Play Store readiness (review guidelines, privacy labels, data-safety forms)
- Country expansion framework (category packs, provider adapters, multi-currency)

## Beyond the brief — features worth building

Ideas that serve the core goal (better decisions, lasting wealth), with the behavioural reasoning:

1. **Safe-to-spend number.** One headline figure = cash − upcoming bills − goal commitments. Answers the real daily question and prevents accidental overspend better than any budget table.
2. **Payday autopilot.** On salary detection, propose a one-tap split (bills buffer / goals / invest / spend). Automation beats willpower — make the default the good decision.
3. **24-hour impulse cooldown.** A wishlist with price + "what this costs your Japan goal" framing; buy tomorrow if you still want it. Directly targets the most regretted spending.
4. **Cost-per-use lens.** Subscriptions and big purchases ranked by $/use (gym visits, streaming hours self-reported). Makes "unused" visceral, not abstract.
5. **Bill-shock radar.** Compare recurring bills against typical market rates (energy, phone, insurance) and estimate switching savings — "your energy plan looks ~$240/yr high."
6. **Interest-rate stress test.** One slider: "what if my mortgage rate rises 1%?" — instant impact on cash flow and health score. Australians' #1 financial anxiety, answered calmly.
7. **Money date ritual.** A guided 10-minute weekly review (wins, anomalies, next week's plan) with a streak. The single highest-leverage habit in personal finance.
8. **Windfall wizard.** Tax refund detected → guided split across debt/emergency/goals showing 10-year compound impact of each option.
9. **Life-event playbooks.** New baby, moving out, first job, redundancy: checklists + budget templates + which Sage features to turn on.
10. **Financial IQ micro-lessons.** 2-minute Duolingo-style lessons (offset accounts, super contributions, index funds) unlocked contextually — learn about offsets the week you get a mortgage, earn XP.
