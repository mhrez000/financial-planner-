# Sage — Architecture

## 1. Stack decisions and trade-offs

| Layer | Choice | Why (and what we rejected) |
| --- | --- | --- |
| Web | **Next.js 14 (App Router) + TypeScript** | Server components keep financial aggregation on the server (fast, private, small bundles); server actions remove a REST layer for first-party mutations. Rejected SPA+REST: more moving parts, slower first paint. |
| Mobile | **React Native (Expo)** | Shares the pure TypeScript domain engines (`src/lib/domain/`) verbatim — score, forecasts, categorisation behave identically everywhere. Rejected Flutter: would duplicate domain logic in Dart. |
| Domain logic | **Pure TS modules, zero I/O** | Unit-testable in ms, runs on server, device, and workers. This is the moat — keep it dependency-free. |
| API for mobile | **REST (OpenAPI) thin layer over the same data services** | Server actions serve web; mobile gets versioned REST. Rejected GraphQL: aggregation shapes are stable and few; GraphQL adds caching/complexity cost without payoff at this stage. |
| Database | **PostgreSQL (prod) / SQLite (dev)** via **Prisma** | Relational fits ledgers; integer-cents everywhere; row-level `userId` scoping enforced in the data layer today, RLS when multi-tenant. SQLite keeps `git clone → npm run dev` friction-free. |
| Auth | **Auth.js (self-hosted) with passkeys + TOTP 2FA** | Bank-adjacent product: keep credentials and sessions in our infra, not a third-party SaaS on the critical path. Clerk is the fallback if delivery speed ever trumps that. |
| Background jobs | **Temporal (or BullMQ to start)** | Bank sync, recurring detection, notifications, report generation. Temporal's replayable workflows suit long-lived consent/sync lifecycles; BullMQ is enough pre-scale. |
| Files | S3-compatible (R2) | Receipts, exports. Pre-signed URLs, SSE encryption. |
| Charts | Recharts (web) / Victory Native (mobile) | Both read the same series-shaped data from the domain layer. |
| Notifications | FCM + APNs behind one `Notifier` interface | Budget-exceeded, bill-due, goal-milestone, price-rise events emitted by workers. |
| Deploy | Vercel (web) + Fly.io/Railway (workers, Postgres) + GitHub Actions CI | Boring, reversible choices. IaC via Terraform when the worker fleet grows. |

## 2. System shape

```
┌─ Web (Next.js, server components + actions) ─┐
│                                              │
├─ Mobile (Expo) ── REST /v1 ──────────────────┤
│                                              ▼
│                                   ┌─ Data services (src/lib/data.ts)
│                                   │    userId-scoped Prisma queries
│                                   │        │
│                                   │        ▼
│                                   │   PostgreSQL
│                                   │
│                                   └─ Domain engines (src/lib/domain/*)
│                                        pure fns: categorise · recurring ·
│                                        healthScore · forecast · debt · insights
▼
Workers (Temporal): bank sync → normalise → categorise → dedupe →
  recurring detection → insight generation → notifications
```

The rule that keeps this maintainable: **I/O at the edges, pure logic in the middle.** Pages and workers fetch rows, hand plain objects to domain engines, persist/render results.

## 3. Australian bank connections (CDR / Open Banking)

Australia's Consumer Data Right is the only correct way to do this — never screen-scrape, never ask for internet banking credentials.

- **Integration path:** accredited **data-recipient intermediaries — Basiq, Frollo, or Adatree** — under the CDR "sponsored accreditation"/representative model. They handle bank-side consent UX, token custody and the ~100-institution long tail (CBA, NAB, ANZ, Westpac, Macquarie, ING, Bendigo, Bankwest all supported day one). Direct ADR accreditation is a later cost-optimisation, not a launch requirement.
- **Consent lifecycle:** read-only scopes (accounts, balances, transactions), explicit purpose, 12-month max duration, one-tap revocation mirrored in-app, automatic data deletion on revocation (CDR obligation).
- **Sync pipeline (worker):** scheduled + webhook-triggered → fetch delta since cursor → normalise merchant strings → `categorise()` (user rules → AU knowledge base → ML fallback) → **dedupe** on `(accountId, amount, date±1d, normalised merchant)` fingerprint with pending→posted reconciliation → `detectRecurring()` refresh → emit insight/notification events.
- **Fallbacks (already implemented):** CSV import and manual entry share the same normalise→categorise→dedupe pipeline, so a user with an unsupported institution loses sync convenience, not features.

## 4. AI coach architecture

Two deliberate layers:

1. **Deterministic insight engine** (`domain/insights.ts`, shipped): computes category momentum, weekday patterns, late-night spend, subscription load, savings-rate feedback. Auditable, instant, free, and works offline.
2. **LLM narration & chat (Phase 3):** Claude receives *structured insight objects and aggregates — never raw transaction rows or merchant PII* — and produces conversational coaching ("You could reach your Japan goal two months sooner by…"), plus a Q&A interface ("can I afford a $2k holiday in March?") that calls the forecast engines as tools. Numbers always come from the deterministic layer; the LLM only phrases and prioritises. This keeps advice trustworthy, cheap, and compliant (general information vs personal financial advice boundary).

## 5. Multi-user & scaling path

- Every table already carries `userId`; the demo user is resolved in exactly one function (`getDemoUser`), which becomes `getSessionUser()` when Auth.js lands — no call-site changes.
- Household mode: `Household` + `Membership(role)` tables; queries scope to household where the user opts in; per-account visibility flags for partner privacy.
- Read-heavy analytics move to materialised monthly aggregates when transaction volume warrants; the domain engines don't change.
- Internationalisation: category packs, merchant knowledge bases and bank providers are data, not code — a `country` dimension on each.

## 6. Testing strategy

- **Domain:** vitest unit tests (21 shipped) — every engine covered including adversarial cases (irregular merchants, lapsed subs, over-deadline goals).
- **Data layer:** integration tests against SQLite in CI.
- **UI:** Playwright smoke flows (dashboard renders score; add transaction → appears categorised; rule retro-applies).
- **CI:** typecheck + tests + build on every push (`.github/workflows/ci.yml`).
