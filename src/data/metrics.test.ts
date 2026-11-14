import { describe, expect, it } from 'vitest';
import {
  buildMemberIndex,
  computeBranchRace,
  computeHeatmap,
  computeKpis,
  computeLeaderboard,
  computeTiers,
  computeTopSukis,
  computeWinBack,
  slotLabel,
  tierFor,
  weekStreak,
} from './metrics';
import { makeBranchResolver, normalizeTxns, parseUtcText, titleCase } from './normalize';
import { DAY_MS, periodRanges, toLocal } from './time';
import { ALL, UNASSIGNED, type RawTxnRow, type Txn } from './types';

// Synthetic fixtures only.
const BRANCHES = [
  { id: 3, code: 'AA', name: 'Alpha' },
  { id: 16, code: 'BB', name: 'Bravo' },
];
const local = (iso: string) => Date.parse(iso + 'Z'); // Manila wall-clock as epoch
const NOW = local('2026-11-14T10:00:00'); // Saturday

function txn(p: Partial<Txn> & { at: string | null }): Txn {
  return {
    t: p.at === null ? null : local(p.at),
    member: p.member ?? 'M1',
    name: p.name ?? 'Test Member',
    branch: p.branch ?? 'AA',
    visit: p.visit ?? Math.random().toString(36),
    earned: p.earned ?? 1,
    redeemed: p.redeemed ?? 0,
    amount: p.amount ?? 0,
  };
}

describe('parseUtcText', () => {
  it('parses plain text timestamps as UTC', () => {
    expect(parseUtcText('2026-11-14 01:39:04')).toBe(Date.UTC(2026, 10, 14, 1, 39, 4));
  });
  it('parses postgres "+00" suffix with fractional seconds', () => {
    expect(parseUtcText('2026-02-21 06:55:42.844112+00')).toBe(Date.UTC(2026, 1, 21, 6, 55, 42, 844));
  });
  it('returns null for null/garbage', () => {
    expect(parseUtcText(null)).toBeNull();
    expect(parseUtcText('not a date')).toBeNull();
  });
});

describe('normalize', () => {
  it('maps branch codes, numeric ids and junk', () => {
    const r = makeBranchResolver(BRANCHES);
    expect(r('AA')).toBe('AA');
    expect(r('16')).toBe('BB');
    expect(r('UNKNOWN')).toBe(UNASSIGNED);
    expect(r(null)).toBe(UNASSIGNED);
  });
  it('shifts UTC to Manila and coerces numbers', () => {
    const raw: RawTxnRow[] = [
      { created_at: '2026-11-14 01:00:00', membership_id: '123', customer_name: 'JUAN DELA CRUZ', branch_id: '3', transaction_id: null, points_earned: '0.25', points_redeemed: null, total_amount: '100.00' },
    ];
    const [t] = normalizeTxns(raw, BRANCHES, 8);
    expect(t!.t).toBe(toLocal(Date.UTC(2026, 10, 14, 1), 8));
    expect(new Date(t!.t!).getUTCHours()).toBe(9);
    expect(t!.branch).toBe('AA');
    expect(t!.earned).toBe(0.25);
    expect(t!.redeemed).toBe(0);
    expect(t!.amount).toBe(100);
    expect(t!.visit).toBe('row-0');
    expect(t!.name).toBe('Juan Dela Cruz');
  });
  it('title-cases names', () => {
    expect(titleCase("MARIA  O'NEIL-SANTOS")).toBe("Maria O'Neil-Santos");
  });
});

describe('periodRanges', () => {
  it('month: to-date vs same elapsed span last month', () => {
    const r = periodRanges(NOW, 'month');
    expect(r.current.start).toBe(local('2026-11-01T00:00:00'));
    expect(r.previous.start).toBe(local('2026-10-01T00:00:00'));
    expect(r.previous.end - r.previous.start).toBe(r.current.end - r.current.start);
    expect(r.buckets).toHaveLength(14);
  });
  it('week starts Monday', () => {
    const r = periodRanges(NOW, 'week');
    expect(r.current.start).toBe(local('2026-11-09T00:00:00'));
    expect(r.buckets).toHaveLength(6);
  });
  it('year buckets by month', () => {
    expect(periodRanges(NOW, 'year').buckets).toHaveLength(11);
  });
});

describe('tierFor', () => {
  it('assigns tier and progress to next', () => {
    expect(tierFor(0).tier.name).toBe('Regular');
    expect(tierFor(20).tier.name).toBe('Silver');
    expect(tierFor(20).next?.name).toBe('Gold');
    expect(tierFor(20).progressPct).toBeCloseTo(50);
    expect(tierFor(150).tier.name).toBe('Platinum');
    expect(tierFor(150).progressPct).toBeNull();
  });
});

describe('member index', () => {
  const txns = [
    txn({ at: '2026-11-13T09:00:00', earned: 5 }),
    txn({ at: '2026-11-04T09:00:00', earned: 5 }),
    txn({ at: '2026-10-28T09:00:00', earned: 5 }),
    txn({ at: '2025-12-01T09:00:00', earned: 100 }), // last year: lifetime only
    txn({ at: null, earned: 1 }),
  ];
  const names = new Map([['M1', 'From Customer Table']]);
  const idx = buildMemberIndex(txns, NOW, names);
  const m = idx.get('M1')!;

  it('aggregates lifetime vs year', () => {
    expect(m.lifetimeEarned).toBe(116);
    expect(m.yearEarned).toBe(15);
    expect(m.name).toBe('From Customer Table');
  });
  it('counts consecutive weekly streak', () => {
    expect(weekStreak(m, NOW)).toBe(3);
  });
  it('falls back to latest transaction name', () => {
    const i2 = buildMemberIndex(
      [txn({ at: '2026-01-01T09:00:00', member: 'X', name: 'Old' }), txn({ at: '2026-06-01T09:00:00', member: 'X', name: 'New' })],
      NOW,
      new Map(),
    );
    expect(i2.get('X')!.name).toBe('New');
  });
});

describe('dashboard metrics', () => {
  const txns: Txn[] = [
    txn({ at: '2026-11-10T09:00:00', member: 'A', branch: 'AA', earned: 10, visit: 'v1' }),
    txn({ at: '2026-11-10T09:00:00', member: 'A', branch: 'AA', earned: 2, visit: 'v1' }), // same visit
    txn({ at: '2026-11-12T19:00:00', member: 'B', branch: 'BB', earned: 4, redeemed: 3, visit: 'v2' }),
    txn({ at: '2026-10-05T09:00:00', member: 'A', branch: 'AA', earned: 6, visit: 'v3' }), // previous period
    txn({ at: '2026-11-11T09:00:00', member: 'C', branch: UNASSIGNED, earned: 4, visit: 'v4' }),
    txn({ at: '2026-08-01T09:00:00', member: 'D', branch: 'BB', earned: 50, visit: 'v5' }), // lapsed
  ];
  const idx = buildMemberIndex(txns, NOW, new Map());

  it('computes KPIs with deltas and scope', () => {
    const k = computeKpis(txns, NOW, 'month', ALL);
    expect(k.issued.value).toBe(20);
    expect(k.issued.deltaPct).toBeCloseTo(((20 - 6) / 6) * 100);
    expect(k.redeemed.value).toBe(3);
    expect(k.active.value).toBe(3);
    expect(k.balance.value).toBe(20 + 6 + 50 - 3);
    expect(k.balance.spark.at(-1)).toBe(k.balance.value);
    expect(computeKpis(txns, NOW, 'month', 'BB').issued.value).toBe(4);
  });

  it('ranks branches and reports unassigned', () => {
    const race = computeBranchRace(txns, NOW, 'month', BRANCHES.map(({ code, name }) => ({ code, name })));
    expect(race.rows.map((r) => r.code)).toEqual(['AA', 'BB']);
    expect(race.rows[0]!.visits).toBe(1);
    expect(race.rows[0]!.ptsPerVisit).toBe(12);
    expect(race.rows[0]!.sharePct).toBeCloseTo(60);
    expect(race.unassigned?.earned).toBe(4);
  });

  it('counts tiers among members active this year', () => {
    const t = computeTiers(idx, ALL);
    expect(t.total).toBe(4);
    expect(t.rows.find((r) => r.tier.name === 'Gold')!.count).toBe(1); // D: 50
  });

  it('ranks top sukis by period points', () => {
    const top = computeTopSukis(txns, idx, NOW, 'month', ALL);
    expect(top.map((r) => r.member)).toEqual(['A', 'B', 'C']);
    expect(top[0]!.visits).toBe(1);
  });

  it('lists lapsed high-value members', () => {
    const wb = computeWinBack(idx, NOW, ALL);
    expect(wb.map((r) => r.member)).toEqual(['D']);
    expect(wb[0]!.daysSince).toBe(Math.floor((NOW - local('2026-08-01T09:00:00')) / DAY_MS));
    expect(computeWinBack(idx, NOW, 'AA')).toEqual([]);
  });

  it('ranks leaderboards highest to lowest per metric, skipping zeros', () => {
    const lb = [
      txn({ at: '2026-11-10T09:00:00', member: 'A', earned: 5, amount: 2000, visit: 'a1' }),
      txn({ at: '2026-11-11T09:00:00', member: 'A', earned: 1, amount: 400, visit: 'a2' }),
      txn({ at: '2026-11-11T10:00:00', member: 'A', earned: 1, amount: 400, visit: 'a3' }),
      txn({ at: '2026-11-12T09:00:00', member: 'B', earned: 9, redeemed: 20, amount: 3600, visit: 'b1' }),
      txn({ at: '2026-11-12T11:00:00', member: 'C', earned: 2, redeemed: 5, amount: 800, visit: 'c1', branch: 'BB' }),
      txn({ at: '2026-10-01T09:00:00', member: 'D', earned: 99, redeemed: 99, amount: 9999, visit: 'd1' }), // outside period
    ];
    const i = buildMemberIndex(lb, NOW, new Map([['A', 'Ana Cruz']]));
    const earned = computeLeaderboard(lb, i, NOW, 'month', ALL, 'earned');
    expect(earned.rows.map((r) => r.member)).toEqual(['B', 'A', 'C']);
    expect(earned.rows[1]).toMatchObject({ rank: 2, name: 'Ana Cruz', earned: 7, visits: 3, spent: 2800 });

    const redeemed = computeLeaderboard(lb, i, NOW, 'month', ALL, 'redeemed');
    expect(redeemed.rows.map((r) => r.member)).toEqual(['B', 'C']); // A never redeemed
    expect(redeemed.total).toBe(2);
    expect(redeemed.rows[0]!.redemptions).toBe(1);

    expect(computeLeaderboard(lb, i, NOW, 'month', ALL, 'visits').rows[0]!.member).toBe('A');
    expect(computeLeaderboard(lb, i, NOW, 'month', ALL, 'spent').rows[0]!.value).toBe(3600);
    expect(computeLeaderboard(lb, i, NOW, 'month', 'BB', 'earned').rows.map((r) => r.member)).toEqual(['C']);
    expect(computeLeaderboard(lb, i, NOW, 'month', ALL, 'earned', 1).rows).toHaveLength(1);
  });

  it('buckets the heatmap by weekday and 2h slot', () => {
    const h = computeHeatmap(txns, periodRanges(NOW, 'month').current, ALL);
    // 2026-11-10 is Tuesday (row 1), 09:00 → slot 0
    expect(h.grid[1]![0]).toBe(12);
    // 2026-11-12 is Thursday (row 3), 19:00 → slot 5
    expect(h.grid[3]![5]).toBe(4);
    expect(h.peak).toEqual({ day: 1, slot: 0 });
    expect(slotLabel(2)).toBe('12 NN');
    expect(slotLabel(5)).toBe('6 PM');
  });
});
