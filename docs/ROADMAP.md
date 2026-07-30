# Sage — Roadmap

## Phase 1 — Foundation ✅ (this repository)

- Competitor analysis, personas, PRD, architecture, design system (docs/)
- Database schema (Prisma, Postgres-portable) + deterministic AU seed
- Design system implemented as tokens + component vocabulary
- Dashboard, transactions (+ rules engine), budgets, goals, analytics, subscriptions, bills, net worth, debt planner, habits/gamification
- Domain engines with 21 unit tests; CI (typecheck, test, build)

## Phase 2 — Real accounts (in progress)

- ✅ Ingestion pipeline shared by every input path: normalise → categorise → duplicate reconciliation (±1-day fingerprint matching) → insert (`src/lib/bank/sync.ts`, `src/lib/domain/dedupe.ts`)
- ✅ Bank-provider abstraction with demo CDR feed exercising the full pipeline ("Sync now"); swapping in Basiq/Frollo changes one file (`src/lib/bank/provider.ts`)
- ✅ CSV import with automatic layout detection (CBA headerless, ING debit/credit, signed-amount formats), preview table, duplicate flagging (`/import`)
- ✅ Notification engine + centre: bill due, budget exceeded/warning, large purchase, salary received, goal milestone, price increase, low balance — same events feed FCM/APNs later (`src/lib/domain/notifications.ts`)
- ✅ Reports with month-on-month category comparison, print-to-PDF, CSV + full JSON export endpoints (`/reports`)
- ✅ Settings with data-portability exports and the Phase-2 security surface (`/settings`)
- ✅ Playwright E2E smoke suite in CI (7 flows incl. import dedupe and sync)
- ✅ Authentication & multi-user: register/login (scrypt + HMAC-signed httpOnly sessions), per-user data isolation, one-tap demo access, 401-guarded APIs; Auth.js/passkeys remain the production upgrade path (`src/lib/auth.ts`)
- ⬜ Real CDR connection via Basiq/Frollo sandbox (consent UX, webhook ingestion)
- ⬜ Postgres migration + RLS; Temporal/BullMQ workers; FCM/APNs delivery
- ⬜ Receipt photo upload (storage + manual amount first)

## Phase 3 — Intelligence & delight (in progress)

- ✅ Investment tracking: holdings, portfolio value/returns, allocation by asset class, dividend history (`/investments`)
- ✅ Tax Centre: AU financial-year deduction tracking with one-tap flagging, likely-deductible suggestions, EOFY CSV export (`/tax`)
- ✅ Savings challenges made real: join/claim/abandon with progress judged live from transactions — the ledger is the referee (`src/lib/domain/challenges.ts`)
- ✅ Sage Coach chat (/coach): intent-based Q&A grounded in the real engines (affordability vs safe-to-spend, score improvement, goal what-ifs, payday plans, subscription audits) behind a `CoachProvider` seam the Claude-backed provider implements in production (`src/lib/domain/coach.ts`)
- ✅ Safe-to-spend headline: cash − 14-day bills − remaining goal commitments, with a line-item breakdown (`src/lib/domain/safeToSpend.ts`)
- ✅ Receipt attachments: per-transaction upload (image/PDF, 5MB) behind a `FileStorage` interface (local disk → S3/R2 swap), auth-checked serving route
- ✅ PWA manifest + icon — installable on mobile home screens
- ✅ Money Date (/review): the guided weekly review ritual — wins → watch-outs → week-ahead plan, computed from live data, ending in a logged habit streak
- ✅ Production deployment: multi-stage Dockerfile (standalone, non-root), docker-compose with Postgres, maintained Postgres schema + generated init migration with a CI drift guard, /api/health endpoint, docs/DEPLOYMENT.md (Docker/Fly/Railway + Vercel paths)

## Phase 3 — Intelligence & delight

- LLM coach (Claude) over the insight engine: conversational Q&A, "what should I do this payday?", affordability checks calling forecast engines as tools
- Receipt/invoice OCR → line-item extraction; smarter ML categorisation fallback
- Investment tracking (shares/ETF/crypto price feeds, dividends, allocation) and super tracking
- Goal milestones with celebrations; full challenge system with social opt-in leaderboards
- Reports + PDF/Excel/CSV export; Tax Centre (deduction tagging, EOFY export)
- Expo mobile apps sharing domain engines; widgets (health score, safe-to-spend)

## Phase 4 — Scale & hardening

- ✅ Household mode v1: households with invite codes, owner/member roles, per-account sharing (privacy enforced in the engine — unshared accounts and spending never enter household aggregates), combined balances and per-member month contributions (`src/lib/domain/household.ts`, `/household`). Later: shared budgets/goals, kids' allowances.
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
