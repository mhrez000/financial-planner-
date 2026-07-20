# Sage — Money, mastered 🌿

A premium personal finance platform built to **change financial behaviour**, not just track it: spend smarter, save more, invest consistently, reduce debt, and build lasting wealth. Australian-first, privacy-first.

This repository contains the production-shaped web application (Next.js App Router) plus the full product documentation set. The mobile apps (React Native / Expo) share the same domain engines — see `docs/ARCHITECTURE.md`.

| Light | Dark |
| --- | --- |
| ![Dashboard, light theme](docs/screenshots/dashboard-light.png) | ![Dashboard, dark theme](docs/screenshots/dashboard-dark.png) |

## What's implemented

| Area | Highlights |
| --- | --- |
| **Dashboard** | Financial Health Score (6 explainable pillars), net worth, cash flow chart, month-end forecast, bills due, budgets, goals, subscriptions, AI-coach insights, recent activity |
| **Transactions** | Search/filter, manual entry with auto-categorisation, user-trainable rules engine ("MCD" → Fast Food) that retro-applies |
| **Budgets** | Category budgets with pro-rata "on track" pacing, month-progress marker, four budgeting methods |
| **Goals** | Progress, predicted completion date, probability of success, one-tap boosts |
| **Analytics** | Trends, category donut, weekday profile, calendar heat map, largest purchases, merchant analysis |
| **Subscriptions** | Automatic detection from transaction patterns (amount + interval stability), price-increase alerts, true annual cost |
| **Bills** | Due dates, autopay status, late-fee warnings |
| **Net worth** | Full asset/liability breakdown incl. property & super, growth chart |
| **Debt planner** | Month-by-month snowball vs avalanche simulation, interest saved, payoff order |
| **Habits & gamification** | Streaks, XP, levels, savings challenges |
| **AI Coach** | Deterministic, explainable insight engine (category momentum, day-of-week patterns, late-night spending, subscription load, savings-rate feedback) — designed for an LLM conversational layer on top |

All domain logic lives in pure, unit-tested modules under `src/lib/domain/` — shared verbatim with mobile and background jobs.

## Getting started

```bash
npm install
cp .env.example .env
npm run db:reset      # creates SQLite db + seeds 8 months of realistic AU data
npm run dev           # http://localhost:3000
```

Other commands: `npm test` (21 domain tests), `npm run typecheck`, `npm run build`.

## Repository layout

```
docs/                  PRD, architecture, design system, security, roadmap
prisma/                schema (SQLite dev / Postgres prod) + deterministic seed
src/lib/domain/        pure engines: categorise, recurring, healthScore,
                       forecast, debt, insights, money (+ tests)
src/lib/               data access (data.ts), server actions, Prisma client
src/components/        UI primitives, charts, app shell
src/app/               one route per feature area
```

## Documentation

- [Product Requirements (PRD)](docs/PRD.md) — personas, competitor analysis, feature spec
- [Architecture](docs/ARCHITECTURE.md) — stack trade-offs, Open Banking (CDR) integration, mobile strategy, scaling path
- [Design system](docs/DESIGN-SYSTEM.md) — tokens, principles, accessibility
- [Security & privacy](docs/SECURITY.md)
- [Roadmap](docs/ROADMAP.md) — phased build order and future features
