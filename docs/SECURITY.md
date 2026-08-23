# Sage — Security & Privacy

Sage handles the most sensitive data most people have. The posture: **collect the minimum, encrypt everything, explain everything, delete on demand.**

## Identity & access

- Auth.js with **passkeys first**, password + **TOTP 2FA** fallback; **biometric unlock** (Face ID / fingerprint) on mobile with a short-lived local session key.
- Sessions: httpOnly, SameSite=Lax, short-lived access + rotating refresh; device list with remote sign-out.
- Every query is `userId`-scoped in the data layer (already enforced); Postgres **row-level security** as a second wall in production.

## Data protection

- **In transit:** TLS 1.3 everywhere, HSTS, certificate pinning in the mobile apps.
- **At rest:** encrypted volumes (AES-256); column-level encryption for account numbers and CDR tokens (envelope encryption, keys in KMS, rotated).
- **Banking data:** CDR read-only scopes via accredited intermediaries — Sage never sees or stores internet-banking credentials. Consent revocation triggers deletion of derived CDR data (regulatory obligation, implemented as a workflow, audited).
- **AI boundary:** the LLM layer receives aggregates and insight objects only — never raw transactions, merchant strings, or identifiers.

## Application security

- Prisma parameterised queries (no SQL injection surface); React auto-escaping + CSP for XSS; server actions validate and coerce all input server-side.
- Dependency audit + secret scanning in CI; least-privilege service tokens; infrastructure changes via reviewed IaC.
- **Audit log:** append-only record of logins, consent changes, exports, deletions; user-visible in Settings.

## Privacy commitments (product-level)

1. No selling or sharing of financial data. No ad SDKs. No credit-score lead-generation.
2. Analytics are first-party and aggregate; opt-out honoured.
3. **Export everything** (CSV/JSON) and **delete everything** (hard delete with 14-day grace) are first-class features.
4. Compliance targets: Australian Privacy Principles, CDR rules, SOC 2 Type II on the roadmap pre-scale.

## Threat notes

| Threat | Mitigation |
| --- | --- |
| Credential stuffing | passkeys, rate limits, breach-password screening |
| Token theft (CDR) | envelope-encrypted at rest, short-lived, scoped read-only, revocable |
| Insider access | RLS + audited break-glass access only |
| Duplicate/replayed sync data | idempotent fingerprint dedupe in the pipeline |
| Prompt injection via merchant names | LLM never receives raw merchant strings; deterministic layer computes all numbers |
