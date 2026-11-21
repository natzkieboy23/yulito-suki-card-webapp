import { useCallback, useMemo, useState } from 'react';
import { flushSync } from 'react-dom';
import { DashboardSkeleton } from './components/Skeleton';
import { BranchRace } from './components/BranchRace';
import { Header } from './components/Header';
import { Heatmap } from './components/Heatmap';
import { KpiRow } from './components/KpiRow';
import { EACH_BRANCH, EACH_BRANCH_LIMIT, LEADER_TABS, Leaderboards, type BranchBoard } from './components/Leaderboards';
import { RefillRadar, Rewards, WinBack } from './components/SidePanels';
import { TierLadder } from './components/TierLadder';
import { TopSukis } from './components/TopSukis';
import { TZ_OFFSET_HOURS } from './config';
import {
  buildMemberIndex,
  computeBranchRace,
  computeHeatmap,
  computeKpis,
  computeLeaderboard,
  computeRedemptions,
  type LeaderMetric,
  computeTiers,
  computeTopSukis,
  computeWinBack,
} from './data/metrics';
import { maskCard } from './data/normalize';
import { periodRanges, toLocal } from './data/time';
import { ALL, UNASSIGNED, type Period, type Scope } from './data/types';
import { useDashboardData, type DashboardData } from './hooks/useDashboardData';
import { toCsv, downloadCsv } from './lib/csv';

const PERIOD_WORD: Record<Period, string> = { week: 'week', month: 'month', year: 'year' };

function Dashboard({ data, refreshing, refresh }: { data: DashboardData; refreshing: boolean; refresh: () => void }) {
  const [period, setPeriod] = useState<Period>('month');
  const [scope, setScope] = useState<Scope>(ALL);
  const [sukiFilter, setSukiFilter] = useState<Scope | null>(null); // null = follow dashboard scope
  const [leaderMetric, setLeaderMetric] = useState<LeaderMetric>('earned');
  const [leaderLimit, setLeaderLimit] = useState(10);
  const [leaderFilter, setLeaderFilter] = useState<Scope | null>(null); // null = follow dashboard scope

  const now = toLocal(data.loadedAt, TZ_OFFSET_HOURS);
  const branchName = useCallback(
    (code: string) => (code === UNASSIGNED ? 'Unassigned' : (data.branches.find((b) => b.code === code)?.name ?? code)),
    [data.branches],
  );

  const index = useMemo(() => buildMemberIndex(data.txns, now, data.names), [data.txns, data.names, now]);
  const ranges = useMemo(() => periodRanges(now, period), [now, period]);
  const kpis = useMemo(() => computeKpis(data.txns, now, period, scope), [data.txns, now, period, scope]);
  const race = useMemo(() => computeBranchRace(data.txns, now, period, data.branches), [data.txns, now, period, data.branches]);
  const tiers = useMemo(() => computeTiers(index, scope), [index, scope]);
  const sukiScope = sukiFilter ?? scope;
  const top = useMemo(() => computeTopSukis(data.txns, index, now, period, sukiScope), [data.txns, index, now, period, sukiScope]);
  const leaderScope = leaderFilter ?? scope;
  const eachBranch = leaderScope === EACH_BRANCH;
  const leaders = useMemo(
    () => computeLeaderboard(data.txns, index, now, period, eachBranch ? ALL : leaderScope, leaderMetric, leaderLimit),
    [data.txns, index, now, period, eachBranch, leaderScope, leaderMetric, leaderLimit],
  );
  const branchBoards = useMemo<BranchBoard[] | null>(
    () =>
      eachBranch
        ? data.branches.map((b) => ({
            code: b.code,
            name: b.name,
            ...computeLeaderboard(data.txns, index, now, period, b.code, leaderMetric, EACH_BRANCH_LIMIT),
          }))
        : null,
    [eachBranch, data.branches, data.txns, index, now, period, leaderMetric],
  );
  const winBack = useMemo(() => computeWinBack(index, now, scope), [index, now, scope]);
  const heat = useMemo(() => computeHeatmap(data.txns, ranges.current, scope), [data.txns, ranges, scope]);
  const redemptions = useMemo(() => computeRedemptions(data.txns, ranges.current, scope), [data.txns, ranges, scope]);

  const focus = (code: string) =>
    withViewTransition(() => {
      setScope((s) => (s === code ? ALL : code));
      setSukiFilter(null);
      setLeaderFilter(null);
    });

  const exportCsv = () => {
    const csv = toCsv([
      {
        title: `Suki Points — ${scope === ALL ? 'All branches' : branchName(scope)} — ${ranges.label}`,
        header: ['Metric', 'Value'],
        rows: [
          ['Points issued', kpis.issued.value.toFixed(2)],
          ['Points redeemed', kpis.redeemed.value.toFixed(2)],
          ['Active sukis', kpis.active.value],
          ['Unredeemed balance (points)', kpis.balance.value.toFixed(2)],
        ],
      },
      {
        title: 'Branch race',
        header: ['Branch', 'Points earned', 'Active sukis', 'Pts per visit', 'Share %', 'Change vs last period %'],
        rows: race.rows.map((r) => [
          r.name,
          r.earned.toFixed(2),
          r.active,
          r.ptsPerVisit.toFixed(2),
          r.sharePct.toFixed(1),
          r.deltaPct?.toFixed(1),
        ]),
      },
      {
        title: 'Top sukis',
        header: ['Rank', 'Name', 'Card', 'Branch', 'Tier', 'Points', 'Visits', 'Week streak'],
        rows: top.map((r) => [r.rank, r.name, maskCard(r.member), branchName(r.branch), r.status.tier.name, r.points.toFixed(2), r.visits, r.streak]),
      },
      {
        title: `Leaderboard — ${LEADER_TABS.find((t) => t.key === leaderMetric)?.label ?? leaderMetric}`,
        header: ['Rank', 'Name', 'Card', 'Branch', 'Points earned', 'Points used', 'Redemptions', 'Visits', 'Spent (PHP)'],
        rows: (branchBoards ? branchBoards.flatMap((b) => b.rows) : leaders.rows).map((r) => [
          r.rank,
          r.name,
          maskCard(r.member),
          branchName(r.branch),
          r.earned.toFixed(2),
          r.redeemed.toFixed(2),
          r.redemptions,
          r.visits,
          r.spent.toFixed(2),
        ]),
      },
    ]);
    const day = new Date(now).toISOString().slice(0, 10);
    downloadCsv(`suki-points-${scope === ALL ? 'all' : scope}-${period}-${day}.csv`, csv);
  };

  return (
    <div className="page">
      <Header
        branchCount={data.branches.length}
        period={period}
        onPeriod={setPeriod}
        scopeName={scope === ALL ? null : branchName(scope)}
        onClearScope={() => focus(scope)}
        periodLabel={ranges.label}
        loadedAt={data.loadedAt}
        refreshing={refreshing}
        onRefresh={refresh}
        onExport={exportCsv}
      />
      <KpiRow k={kpis} />
      <div className="grid">
        <div className="col-main">
          <BranchRace rows={race.rows} unassigned={race.unassigned} scope={scope} onFocus={focus} />
        </div>
        <div className="col-side">
          <TierLadder rows={tiers.rows} total={tiers.total} />
        </div>
        <div className="col-main">
          <TopSukis
            rows={top}
            branches={data.branches}
            branchName={branchName}
            filter={sukiScope}
            onFilter={setSukiFilter}
            periodWord={PERIOD_WORD[period]}
          />
        </div>
        <div className="col-side stack-gap">
          <RefillRadar />
          <WinBack rows={winBack} branchName={branchName} />
        </div>
        <div className="col-full">
          <Leaderboards
            metric={leaderMetric}
            onMetric={setLeaderMetric}
            limit={leaderLimit}
            onLimit={setLeaderLimit}
            rows={leaders.rows}
            total={leaders.total}
            branches={data.branches}
            branchName={branchName}
            filter={leaderScope}
            onFilter={setLeaderFilter}
            boards={branchBoards}
            periodWord={PERIOD_WORD[period]}
          />
        </div>
        <div className="col-main">
          <Heatmap data={heat} />
        </div>
        <div className="col-side">
          <Rewards count={redemptions.count} points={redemptions.points} />
        </div>
      </div>
      <p className="footer muted small">
        Live data from the suki card database · times shown in Philippine time · refreshes every 5 minutes.
      </p>
    </div>
  );
}

export default function App() {
  const { status, data, error, refreshing, refresh } = useDashboardData();
  if (data) {
    return (
      <>
        {status === 'error' && <div className="banner-error">Refresh failed: {error} — showing last loaded data.</div>}
        <Dashboard data={data} refreshing={refreshing} refresh={() => void refresh()} />
      </>
    );
  }
  if (status === 'error') {
    return (
      <div className="center">
        <div className="card state">
          <h2>Couldn’t load suki data</h2>
          <p className="muted small">{error}</p>
          <button className="btn-primary" onClick={() => void refresh()}>
            Try again
          </button>
        </div>
      </div>
    );
  }
  return <DashboardSkeleton />;
}

/**
 * Crossfade the whole dashboard when the branch focus changes (View Transitions API).
 * Browsers without it, or users who prefer reduced motion, get the instant update.
 */
function withViewTransition(update: () => void) {
  const doc = document as unknown as { startViewTransition?: (cb: () => void) => unknown };
  if (!doc.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    update();
    return;
  }
  doc.startViewTransition(() => flushSync(update));
}
