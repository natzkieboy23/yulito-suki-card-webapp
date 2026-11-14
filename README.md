# Suki Points Dashboard

Loyalty-card (suki card) points dashboard for **Yulito Pharmacy**'s five branches. It reads the existing suki card database in Supabase and shows how points are earned and redeemed, which branches lead, who the top sukis are, and when sukis shop.

Built with React 19, Vite and TypeScript. The design follows `Suki Points — all-branch dashboard.pdf`.

## Features

- **Headline figures**: points issued, points redeemed with redemption rate (healthy range 30–50%), active sukis, and unredeemed balance in pesos. Each shows a sparkline and the change against the same days one period earlier.
- **Week / Month / Year** toggle (periods run to date in Philippine time).
- **Branch race**: branches ranked by points earned. Click a branch to focus the whole dashboard on it.
- **Tier ladder**: Platinum, Gold, Silver and Regular, based on calendar-year points.
- **Top sukis**: top 10 earners with visits, weekly visit streak and progress to the next tier. Filter by branch.
- **Leaderboards**: sukis ranked highest to lowest by points earned, points used (redeemed), number of visits, or pesos spent. Shows each suki's name, masked card and branch, with Top 10 / 25 / 50. Filter to one branch, or pick **Each branch** to see the top 5 at every branch side by side.
- **Win-back list**: high-value sukis with no visit in 45+ days.
- **When sukis earn**: heatmap of points by weekday and 2-hour slot, naming the busiest and quietest slots.
- **CSV export** of the current view. Auto-refresh every 5 minutes.
- Card numbers are always masked (`•••• 1234`).

Not yet available (shown as "coming soon" because the database has no data for them): points expiry, refill radar for maintenance medicines, rewards catalog ranking, and SMS reminders.

## Getting started

Requirements: Node.js 20+ and npm.

```bash
git clone https://github.com/natzkieboy23/yulito-suki-card-webapp.git
cd yulito-suki-card-webapp
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:5173
```

`.env.local`:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Use the **anon** key only. Anything prefixed `VITE_` is bundled into the browser, so never put the `service_role` key there.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Typecheck and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Typecheck only |
| `npm test` | Run unit tests (Vitest) |

## Data source

The app is read-only. It reads three existing Supabase tables:

| Table | Used for |
| --- | --- |
| `membership_points_table` | Every points transaction: member, branch, transaction, points earned and redeemed, time |
| `customer_table` | Member names, matched by membership code |
| `branch_table` | Branch codes and names |

All figures are calculated in the browser from these rows (`src/data/metrics.ts`). The app also cleans up a few data quirks:

- Timestamps are stored as UTC text and shown in Philippine time (UTC+8).
- Some rows store a branch id instead of a branch code, or `UNKNOWN`. Ids are mapped to codes; anything else is counted as "Unassigned".
- Members missing from `customer_table` take their name from their latest transaction.

## Configuration

Business rules live in `src/config.ts`:

- `TIERS`: tier thresholds by yearly points (default Platinum 100+, Gold 40+, Silver 15+, Regular). Points are earned at about 0.25 per ₱100 spent (1 point per roughly ₱400), so thresholds are small.
- `POINT_VALUE_PESOS`: peso value of one point (default ₱1.00).
- `WINBACK_DAYS`: days without a visit before a suki appears in the win-back list (default 45).
- `HEALTHY_REDEMPTION`: target redemption-rate band.
- `REFRESH_MS`: auto-refresh interval.

## Project structure

```
src/
  config.ts             business rules
  data/                 types, time helpers, normalization, metrics (+ tests)
  hooks/                useDashboardData: loads and refreshes Supabase data
  lib/                  Supabase client, formatting, CSV export
  components/           dashboard widgets
  App.tsx               layout and state (period, branch focus)
```

## Security

The dashboard currently has **no login**, and the Supabase tables allow the anon key to read customer records. Do not deploy it to a public URL until row-level security (RLS) and authentication are set up in Supabase.
