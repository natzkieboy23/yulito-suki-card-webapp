import { TIERS, WINBACK_DAYS, type Tier } from '../config';
import { DAY_MS, WEEK_MS, inRange, periodRanges, startOfWeek, startOfYear, type Range } from './time';
import { ALL, UNASSIGNED, type Branch, type Period, type Scope, type Txn } from './types';

const inScope = (t: Txn, scope: Scope) => scope === ALL || t.branch === scope;

export function deltaPct(cur: number, prev: number): number | null {
  return prev > 0 ? ((cur - prev) / prev) * 100 : null;
}

// ---------------------------------------------------------------- tiers

export interface TierStatus {
  tier: Tier;
  next: Tier | null;
  /** % of the way to the next tier's minimum; null at the top tier. */
  progressPct: number | null;
}

export function tierFor(points: number): TierStatus {
  const idx = TIERS.findIndex((t) => points >= t.min);
  const i = idx === -1 ? TIERS.length - 1 : idx;
  const tier = TIERS[i]!;
  const next = i > 0 ? TIERS[i - 1]! : null;
  const progressPct = next ? Math.min(100, Math.max(0, (points / next.min) * 100)) : null;
  return { tier, next, progressPct };
}

// ---------------------------------------------------------------- member index

export interface MemberAgg {
  id: string;
  name: string;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  lastVisit: number | null;
  /** Calendar-year-to-date points (all branches) — drives tier. */
  yearEarned: number;
  /** Branches visited this calendar year. */
  yearBranches: Set<string>;
  /** Monday-start week keys with at least one visit. */
  weeks: Set<number>;
  /** Lifetime row count per branch — drives home branch. */
  branchCounts: Map<string, number>;
}

export function buildMemberIndex(txns: Txn[], now: number, names: Map<string, string>): Map<string, MemberAgg> {
  const yearStart = startOfYear(now);
  const index = new Map<string, MemberAgg>();
  const latestNameAt = new Map<string, number>();

  for (const t of txns) {
    let m = index.get(t.member);
    if (!m) {
      m = {
        id: t.member,
        name: names.get(t.member) ?? '',
        lifetimeEarned: 0,
        lifetimeRedeemed: 0,
        lastVisit: null,
        yearEarned: 0,
        yearBranches: new Set(),
        weeks: new Set(),
        branchCounts: new Map(),
      };
      index.set(t.member, m);
    }
    m.lifetimeEarned += t.earned;
    m.lifetimeRedeemed += t.redeemed;
    m.branchCounts.set(t.branch, (m.branchCounts.get(t.branch) ?? 0) + 1);

    // Fallback name: most recent transaction's customer_name (customer_table misses ~half of members).
    if (!names.has(t.member) && t.name) {
      const at = t.t ?? -Infinity;
      if (at >= (latestNameAt.get(t.member) ?? -Infinity)) {
        m.name = t.name;
        latestNameAt.set(t.member, at);
      }
    }

    if (t.t !== null && t.t <= now) {
      if (m.lastVisit === null || t.t > m.lastVisit) m.lastVisit = t.t;
      m.weeks.add(startOfWeek(t.t));
      if (t.t >= yearStart) {
        m.yearEarned += t.earned;
        m.yearBranches.add(t.branch);
      }
    }
  }
  for (const m of index.values()) if (!m.name) m.name = `Member ${m.id.slice(-4)}`;
  return index;
}

function topKey(counts: Map<string, number>): string {
  let best = UNASSIGNED;
  let n = -1;
  for (const [k, v] of counts) {
    if (v > n) {
      best = k;
      n = v;
    }
  }
  return best;
}

export const homeBranch = (m: MemberAgg) => topKey(m.branchCounts);

/** Consecutive weeks with a visit, ending this week (or last week if none yet this week). */
export function weekStreak(m: MemberAgg, now: number): number {
  let w = startOfWeek(now);
  if (!m.weeks.has(w)) w -= WEEK_MS;
  let n = 0;
  while (m.weeks.has(w)) {
    n++;
    w -= WEEK_MS;
  }
  return n;
}

// ---------------------------------------------------------------- KPIs

export interface Kpis {
  issued: { value: number; deltaPct: number | null; spark: number[] };
  redeemed: { value: number; ratePct: number | null; spark: number[] };
  active: { value: number; deltaPct: number | null; spark: number[] };
  balance: { value: number; deltaPct: number | null; spark: number[] };
}

export function computeKpis(txns: Txn[], now: number, period: Period, scope: Scope): Kpis {
  const r = periodRanges(now, period);
  const n = r.buckets.length;
  const issuedSpark = new Array<number>(n).fill(0);
  const redeemedSpark = new Array<number>(n).fill(0);
  const netSpark = new Array<number>(n).fill(0);
  const activeBuckets = Array.from({ length: n }, () => new Set<string>());
  const activeCur = new Set<string>();
  const activePrev = new Set<string>();
  let issued = 0;
  let issuedPrev = 0;
  let redeemed = 0;
  let balance = 0;
  let balanceAtStart = 0;
  let balanceAtPrevStart = 0;

  for (const t of txns) {
    if (!inScope(t, scope)) continue;
    const net = t.earned - t.redeemed;
    balance += net;
    // Unknown-time rows are treated as historical (before any period).
    if (t.t === null || t.t < r.current.start) balanceAtStart += net;
    if (t.t === null || t.t < r.previous.start) balanceAtPrevStart += net;

    if (inRange(t.t, r.current)) {
      issued += t.earned;
      redeemed += t.redeemed;
      activeCur.add(t.member);
      const b = r.buckets.findIndex((bk) => t.t! >= bk.start && t.t! < bk.end);
      if (b >= 0) {
        issuedSpark[b]! += t.earned;
        redeemedSpark[b]! += t.redeemed;
        netSpark[b]! += net;
        activeBuckets[b]!.add(t.member);
      }
    } else if (inRange(t.t, r.previous)) {
      issuedPrev += t.earned;
      activePrev.add(t.member);
    }
  }

  let running = balanceAtStart;
  const balanceSpark = netSpark.map((v) => (running += v));
  // Balance growth over the period vs growth over the previous period.
  const growthCur = balance - balanceAtStart;
  const growthPrev = balanceAtStart - balanceAtPrevStart;

  return {
    issued: { value: issued, deltaPct: deltaPct(issued, issuedPrev), spark: issuedSpark },
    redeemed: { value: redeemed, ratePct: issued > 0 ? (redeemed / issued) * 100 : null, spark: redeemedSpark },
    active: { value: activeCur.size, deltaPct: deltaPct(activeCur.size, activePrev.size), spark: activeBuckets.map((s) => s.size) },
    balance: { value: balance, deltaPct: deltaPct(growthCur, growthPrev), spark: balanceSpark },
  };
}

// ---------------------------------------------------------------- branch race

export interface BranchStat {
  code: string;
  name: string;
  earned: number;
  active: number;
  visits: number;
  ptsPerVisit: number;
  sharePct: number;
  deltaPct: number | null;
}

export function computeBranchRace(txns: Txn[], now: number, period: Period, branches: Branch[]) {
  const r = periodRanges(now, period);
  const acc = new Map<string, { earned: number; prev: number; members: Set<string>; visits: Set<string> }>();
  const get = (code: string) => {
    let a = acc.get(code);
    if (!a) acc.set(code, (a = { earned: 0, prev: 0, members: new Set(), visits: new Set() }));
    return a;
  };
  let total = 0;
  for (const t of txns) {
    if (inRange(t.t, r.current)) {
      const a = get(t.branch);
      a.earned += t.earned;
      a.members.add(t.member);
      a.visits.add(t.visit);
      total += t.earned;
    } else if (inRange(t.t, r.previous)) {
      get(t.branch).prev += t.earned;
    }
  }
  const rows: BranchStat[] = branches.map((b) => {
    const a = get(b.code);
    return {
      code: b.code,
      name: b.name,
      earned: a.earned,
      active: a.members.size,
      visits: a.visits.size,
      ptsPerVisit: a.visits.size ? a.earned / a.visits.size : 0,
      sharePct: total ? (a.earned / total) * 100 : 0,
      deltaPct: deltaPct(a.earned, a.prev),
    };
  });
  rows.sort((x, y) => y.earned - x.earned);
  const un = acc.get(UNASSIGNED);
  return { rows, total, unassigned: un ? { earned: un.earned, sharePct: total ? (un.earned / total) * 100 : 0 } : null };
}

// ---------------------------------------------------------------- tier ladder

export interface TierCount {
  tier: Tier;
  count: number;
  pct: number;
}

/** Members active this calendar year (in scope), bucketed by their all-branch yearly points. */
export function computeTiers(index: Map<string, MemberAgg>, scope: Scope): { rows: TierCount[]; total: number } {
  const counts = new Map<string, number>(TIERS.map((t) => [t.name, 0]));
  let total = 0;
  for (const m of index.values()) {
    if (m.yearBranches.size === 0) continue;
    if (scope !== ALL && !m.yearBranches.has(scope)) continue;
    const { tier } = tierFor(m.yearEarned);
    counts.set(tier.name, (counts.get(tier.name) ?? 0) + 1);
    total++;
  }
  return {
    total,
    rows: TIERS.map((tier) => {
      const count = counts.get(tier.name) ?? 0;
      return { tier, count, pct: total ? (count / total) * 100 : 0 };
    }),
  };
}

// ---------------------------------------------------------------- top sukis

export interface SukiRow {
  rank: number;
  member: string;
  name: string;
  branch: string;
  points: number;
  visits: number;
  streak: number;
  status: TierStatus;
}

export function computeTopSukis(
  txns: Txn[],
  index: Map<string, MemberAgg>,
  now: number,
  period: Period,
  scope: Scope,
  limit = 10,
): SukiRow[] {
  const r = periodRanges(now, period);
  const acc = new Map<string, { points: number; visits: Set<string>; branches: Map<string, number> }>();
  for (const t of txns) {
    if (!inScope(t, scope) || !inRange(t.t, r.current)) continue;
    let a = acc.get(t.member);
    if (!a) acc.set(t.member, (a = { points: 0, visits: new Set(), branches: new Map() }));
    a.points += t.earned;
    a.visits.add(t.visit);
    a.branches.set(t.branch, (a.branches.get(t.branch) ?? 0) + 1);
  }
  return [...acc.entries()]
    .sort((x, y) => y[1].points - x[1].points)
    .slice(0, limit)
    .map(([member, a], i) => {
      const m = index.get(member);
      return {
        rank: i + 1,
        member,
        name: m?.name ?? member,
        branch: topKey(a.branches),
        points: a.points,
        visits: a.visits.size,
        streak: m ? weekStreak(m, now) : 0,
        status: tierFor(m?.yearEarned ?? 0),
      };
    });
}

// ---------------------------------------------------------------- leaderboards

export type LeaderMetric = 'earned' | 'redeemed' | 'visits' | 'spent';

export interface LeaderRow {
  rank: number;
  member: string;
  name: string;
  /** Branch with the most transactions for this member in the period (within scope). */
  branch: string;
  earned: number;
  redeemed: number;
  redemptions: number;
  visits: number;
  spent: number;
  /** The ranked metric's value. */
  value: number;
}

/**
 * Members ranked highest → lowest by one metric over the period, in scope.
 * Members whose value is 0 are left out. `total` is how many members qualified before the limit.
 */
export function computeLeaderboard(
  txns: Txn[],
  index: Map<string, MemberAgg>,
  now: number,
  period: Period,
  scope: Scope,
  metric: LeaderMetric,
  limit = 10,
): { rows: LeaderRow[]; total: number } {
  const r = periodRanges(now, period);
  const acc = new Map<
    string,
    { earned: number; redeemed: number; redemptions: number; spent: number; visits: Set<string>; branches: Map<string, number> }
  >();
  for (const t of txns) {
    if (!inScope(t, scope) || !inRange(t.t, r.current)) continue;
    let a = acc.get(t.member);
    if (!a) acc.set(t.member, (a = { earned: 0, redeemed: 0, redemptions: 0, spent: 0, visits: new Set(), branches: new Map() }));
    a.earned += t.earned;
    a.redeemed += t.redeemed;
    if (t.redeemed > 0) a.redemptions++;
    a.spent += t.amount;
    a.visits.add(t.visit);
    a.branches.set(t.branch, (a.branches.get(t.branch) ?? 0) + 1);
  }
  const all = [...acc.entries()]
    .map(([member, a]) => {
      const row = {
        member,
        name: index.get(member)?.name ?? member,
        branch: topKey(a.branches),
        earned: a.earned,
        redeemed: a.redeemed,
        redemptions: a.redemptions,
        visits: a.visits.size,
        spent: a.spent,
      };
      return { ...row, value: row[metric] };
    })
    .filter((x) => x.value > 0)
    .sort((x, y) => y.value - x.value || x.member.localeCompare(y.member));
  return { total: all.length, rows: all.slice(0, limit).map((x, i) => ({ rank: i + 1, ...x })) };
}

// ---------------------------------------------------------------- win-back

export interface WinBackRow {
  member: string;
  name: string;
  branch: string;
  daysSince: number;
  lifetimeEarned: number;
}

export function computeWinBack(index: Map<string, MemberAgg>, now: number, scope: Scope, limit = 5): WinBackRow[] {
  const cutoff = now - WINBACK_DAYS * DAY_MS;
  const rows: WinBackRow[] = [];
  for (const m of index.values()) {
    if (m.lastVisit === null || m.lastVisit > cutoff) continue;
    const branch = homeBranch(m);
    if (scope !== ALL && branch !== scope) continue;
    rows.push({
      member: m.id,
      name: m.name,
      branch,
      daysSince: Math.floor((now - m.lastVisit) / DAY_MS),
      lifetimeEarned: m.lifetimeEarned,
    });
  }
  return rows.sort((a, b) => b.lifetimeEarned - a.lifetimeEarned).slice(0, limit);
}

// ---------------------------------------------------------------- heatmap

export const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const HEATMAP_START_HOUR = 8;
export const HEATMAP_SLOTS = 7; // 2-hour slots: 8 AM … 10 PM

export interface Heatmap {
  grid: number[][];
  max: number;
  peak: { day: number; slot: number } | null;
  quiet: { day: number; slot: number } | null;
}

export function computeHeatmap(txns: Txn[], range: Range, scope: Scope): Heatmap {
  const grid = HEATMAP_DAYS.map(() => new Array<number>(HEATMAP_SLOTS).fill(0));
  let any = false;
  for (const t of txns) {
    if (!inScope(t, scope) || !inRange(t.t, range)) continue;
    const d = new Date(t.t);
    const slot = Math.floor((d.getUTCHours() - HEATMAP_START_HOUR) / 2);
    if (slot < 0 || slot >= HEATMAP_SLOTS) continue;
    grid[(d.getUTCDay() + 6) % 7]![slot]! += t.earned;
    any = true;
  }
  let max = 0;
  let peak: Heatmap['peak'] = null;
  let quiet: Heatmap['quiet'] = null;
  let min = Infinity;
  grid.forEach((row, day) =>
    row.forEach((v, slot) => {
      if (v > max) {
        max = v;
        peak = { day, slot };
      }
      if (v < min) {
        min = v;
        quiet = { day, slot };
      }
    }),
  );
  return { grid, max, peak: any ? peak : null, quiet: any ? quiet : null };
}

export function slotLabel(slot: number): string {
  const h = HEATMAP_START_HOUR + slot * 2;
  if (h === 12) return '12 NN';
  return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
}

// ---------------------------------------------------------------- redemptions

export function computeRedemptions(txns: Txn[], range: Range, scope: Scope) {
  let count = 0;
  let points = 0;
  for (const t of txns) {
    if (t.redeemed <= 0 || !inScope(t, scope) || !inRange(t.t, range)) continue;
    count++;
    points += t.redeemed;
  }
  return { count, points };
}
