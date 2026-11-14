import type { LeaderMetric, LeaderRow } from '../data/metrics';
import { maskCard } from '../data/normalize';
import { ALL, type Branch, type Scope } from '../data/types';
import { fmtInt, fmtPeso, fmtPts, initials } from '../lib/format';
import { Bar, Card, Empty } from './ui';

export const LEADER_TABS: { key: LeaderMetric; label: string; unit: string; blurb: string }[] = [
  { key: 'earned', label: 'Top earners', unit: 'pts', blurb: 'Sukis who earned the most points' },
  { key: 'redeemed', label: 'Top redeemers', unit: 'pts used', blurb: 'Sukis who used the most points' },
  { key: 'visits', label: 'Most visits', unit: 'visits', blurb: 'Sukis with the most purchases' },
  { key: 'spent', label: 'Top spenders', unit: '', blurb: 'Sukis who spent the most' },
];

export const LEADER_LIMITS = [10, 25, 50] as const;

/** Leaderboard filter value that shows a short board for every branch side by side. */
export const EACH_BRANCH = 'EACH';
export const EACH_BRANCH_LIMIT = 5;

export interface BranchBoard {
  code: string;
  name: string;
  rows: LeaderRow[];
  total: number;
}

function fmtValue(metric: LeaderMetric, v: number): string {
  if (metric === 'spent') return fmtPeso(v);
  if (metric === 'visits') return fmtInt(v);
  return fmtPts(v);
}

/** Secondary facts shown under each name — the other metrics, so a row reads on its own. */
function detail(metric: LeaderMetric, r: LeaderRow): string {
  const parts: string[] = [];
  if (metric !== 'earned') parts.push(`${fmtPts(r.earned)} pts earned`);
  if (metric !== 'redeemed' && r.redeemed > 0) parts.push(`${fmtPts(r.redeemed)} pts used`);
  if (metric === 'redeemed') parts.push(`${fmtInt(r.redemptions)} ${r.redemptions === 1 ? 'redemption' : 'redemptions'}`);
  if (metric !== 'visits') parts.push(`${fmtInt(r.visits)} ${r.visits === 1 ? 'visit' : 'visits'}`);
  if (metric !== 'spent') parts.push(`${fmtPeso(r.spent)} spent`);
  return parts.join(' · ');
}

function LeaderItem({ r, metric, unit, max, branchName, showBranch }: {
  r: LeaderRow;
  metric: LeaderMetric;
  unit: string;
  max: number;
  branchName: (code: string) => string;
  showBranch: boolean;
}) {
  return (
    <li className={r.rank <= 3 ? `leader leader-top leader-${r.rank}` : 'leader'}>
      <span className="leader-rank">{r.rank}</span>
      <span className="avatar avatar-sm">{initials(r.name)}</span>
      <div className="leader-main">
        <div className="leader-top-line">
          <span className="leader-name">
            <strong>{r.name}</strong>
            <span className="muted small">
              {' '}
              {maskCard(r.member)}
              {showBranch && ` · ${branchName(r.branch)}`}
            </span>
          </span>
          <strong className="num leader-value">
            {fmtValue(metric, r.value)}
            {unit && <span className="muted small"> {unit}</span>}
          </strong>
        </div>
        <Bar pct={(r.value / max) * 100} />
        <span className="muted small">{detail(metric, r)}</span>
      </div>
    </li>
  );
}

export function Leaderboards(props: {
  metric: LeaderMetric;
  onMetric: (m: LeaderMetric) => void;
  limit: number;
  onLimit: (n: number) => void;
  rows: LeaderRow[];
  total: number;
  branches: Branch[];
  branchName: (code: string) => string;
  /** ALL, a branch code, or EACH_BRANCH. */
  filter: Scope;
  onFilter: (f: Scope) => void;
  /** Filled when filter is EACH_BRANCH. */
  boards: BranchBoard[] | null;
  periodWord: string;
}) {
  const tab = LEADER_TABS.find((t) => t.key === props.metric) ?? LEADER_TABS[0]!;
  const each = props.filter === EACH_BRANCH;
  const max = Math.max(...props.rows.map((r) => r.value), 0) || 1;
  const where = each ? ' at each branch' : props.filter === ALL ? '' : ` at ${props.branchName(props.filter)}`;
  const chips: { key: Scope; label: string; title: string }[] = [
    { key: ALL, label: 'All', title: 'All branches' },
    ...props.branches.map((b) => ({ key: b.code, label: b.code, title: b.name })),
    { key: EACH_BRANCH, label: 'Each branch', title: `Top ${EACH_BRANCH_LIMIT} at every branch, side by side` },
  ];
  const empty = props.metric === 'redeemed' ? 'No sukis used points in this period.' : 'No suki purchases in this period.';

  return (
    <Card
      title="Leaderboards"
      subtitle={`${tab.blurb} this ${props.periodWord}${where}, highest to lowest`}
      aside={
        !each && (
          <label className="limit small">
            Show
            <select id="leader-limit" value={props.limit} onChange={(e) => props.onLimit(Number(e.target.value))}>
              {LEADER_LIMITS.map((n) => (
                <option key={n} value={n}>
                  Top {n}
                </option>
              ))}
            </select>
          </label>
        )
      }
    >
      <div className="chips leader-chips" role="group" aria-label="Branch">
        {chips.map((c) => (
          <button
            key={c.key}
            className={`chip ${props.filter === c.key ? 'chip-dark' : ''}`}
            onClick={() => props.onFilter(c.key)}
            aria-pressed={props.filter === c.key}
            title={c.title}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="tabs" role="tablist" aria-label="Leaderboard">
        {LEADER_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={props.metric === t.key}
            className={`tab ${props.metric === t.key ? 'tab-active' : ''}`}
            onClick={() => props.onMetric(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {each && props.boards ? (
        <div className="branch-boards" role="tabpanel">
          {props.boards.map((b) => {
            const bmax = Math.max(...b.rows.map((r) => r.value), 0) || 1;
            return (
              <section key={b.code} className="branch-board">
                <header className="branch-board-head">
                  <strong>{b.name}</strong>
                  <span className="muted small">{fmtInt(b.total)} ranked</span>
                </header>
                {b.rows.length === 0 ? (
                  <Empty>{empty}</Empty>
                ) : (
                  <ol className="leaders leaders-single">
                    {b.rows.map((r) => (
                      <LeaderItem key={r.member} r={r} metric={props.metric} unit={tab.unit} max={bmax} branchName={props.branchName} showBranch={false} />
                    ))}
                  </ol>
                )}
              </section>
            );
          })}
        </div>
      ) : props.rows.length === 0 ? (
        <Empty>{empty}</Empty>
      ) : (
        <>
          <ol className="leaders" role="tabpanel">
            {props.rows.map((r) => (
              <LeaderItem
                key={r.member}
                r={r}
                metric={props.metric}
                unit={tab.unit}
                max={max}
                branchName={props.branchName}
                showBranch={props.filter === ALL}
              />
            ))}
          </ol>
          <p className="muted small footnote">
            Showing {fmtInt(props.rows.length)} of {fmtInt(props.total)} sukis ranked.
          </p>
        </>
      )}
    </Card>
  );
}
