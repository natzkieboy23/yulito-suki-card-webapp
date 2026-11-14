# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Vite dev server (needs .env.local — copy .env.example)
npm run build        # tsc -b (typecheck) + vite build → dist/
npm run typecheck    # tsc -b only
npm test             # vitest run (unit tests, synthetic fixtures, no network)
npx vitest run src/data/metrics.test.ts -t "periodRanges"   # single file / single test
```

Remote: https://github.com/natzkieboy23/yulito-suki-card-webapp.git

## What the app is

"Suki Points" — read-only loyalty dashboard for Yulito Pharmacy's 5 branches, built from the design mock `Suki Points — all-branch dashboard.pdf`. React 19 + Vite + TypeScript, plain CSS (`src/styles.css`, tokens on `:root`), only runtime dep besides React is `@supabase/supabase-js`.

## Data source (existing Supabase tables, owned by the POS — do not alter schema casually)

- `membership_points_table` — one row per POS line/transaction: `membership_id` (= card number = `customer_table.membership_code`), `customer_name`, `branch_id`, `transaction_id`, `points_earned`, `points_redeemed`, `created_at`.
- `customer_table` — member master (`membership_code`, names, PII fields). Covers only ~half of members seen in transactions.
- `branch_table` — `id`, `code` (GP, TP, BP1, BP2, LP), `name`.
- `points_history_table` — 30 legacy 2025 balance rows; currently **not used**.

Data quirks handled in `src/data/normalize.ts` (keep them there):
- `created_at` is a **TEXT** column holding **UTC** (`YYYY-MM-DD HH:mm:ss`, some `…ffffff+00`, ~1000 null). Null-time rows count toward lifetime totals/balance but are excluded from period metrics.
- `branch_id` is mostly a code but sometimes `branch_table.id` as text ("16") or "UNKNOWN" → resolved to code or `UNASSIGNED`.
- Member display name: `customer_table` first, else the latest transaction's `customer_name`. Names are stored uppercase → title-cased.
- A "visit" = distinct `transaction_id` (several rows can share one).
- Points scale is ~0.25 pts per ₱100 (1 pt per ~₱400), so tier thresholds in `src/config.ts` are small (not the mock's 12,000).

## Architecture

```
useDashboardData (hooks)  → fetchAll() pages every table row in parallel (1000/page, 6 concurrent) via anon key
  → normalizeTxns()       → Txn[] with t = Manila wall-clock encoded as epoch ms
App.tsx                   → useMemo over pure functions in src/data/metrics.ts
  → components/*          → presentational only
```

- **All aggregation is client-side** in pure functions (`src/data/metrics.ts`) so it is unit-testable. Full load is ~26k rows / ~2 s. If tables grow far beyond that, move aggregation into Postgres RPCs/views rather than fetching more.
- **Time handling:** local times are UTC+8 wall-clock stored as epoch ms and read with `getUTC*` (see `src/data/time.ts`). Never use `getHours()`/`toLocale*` on these values. Periods are to-date (week starts Monday) compared against the same elapsed span of the previous period.
- **Branch focus:** clicking a Branch race row sets `scope`; every widget takes `scope` except Branch race itself (always shows all branches). Top-sukis chips override scope locally (`sukiFilter`, reset when scope changes).
- Tier = calendar-year-to-date points across all branches; win-back uses the member's home branch (most transactions lifetime).
- Business constants (tiers, peso per point, win-back days, timezone, refresh interval) live in `src/config.ts`.
- Mock widgets with no backing data render `<ComingSoon>`: points expiry, refill radar, rewards catalog. SMS buttons are disabled — no SMS integration exists.

## Security notes

- Browser uses the **anon key only** (`VITE_SUPABASE_*` in `.env.local`, git-ignored). Never put the service_role key in a `VITE_` variable or in the repo.
- As of 2026-11-14 the tables have no restrictive RLS: the anon key can read all customer PII. The owner chose "no login for now"; do not deploy publicly until RLS + auth are added. Card numbers are masked in the UI (`maskCard`).
