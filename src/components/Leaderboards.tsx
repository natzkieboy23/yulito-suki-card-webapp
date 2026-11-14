import type { LeaderMetric, LeaderRow } from '../data/metrics';
import { maskCard } from '../data/normalize';
import { fmtInt, fmtPeso, fmtPts, initials } from '../lib/format';
import { Bar, Card, Empty } from './ui';

export const LEADER_TABS: { key: LeaderMetric; label: string; unit: string; blurb: string }[] = [
  { key: 'earned', label: 'Top earners', unit: 'pts', blurb: 'Sukis who earned the most points' },
  { key: 'redeemed', label: 'Top redeemers', unit: 'pts used', blurb: 'Sukis who used the most points' },
  { key: 'visits', label: 'Most visits', unit: 'visits', blurb: 'Sukis with the most purchases' },
  { key: 'spent', label: 'Top spenders', unit: '', blurb: 'Sukis who spent the most' },
];

export const LEADER_LIMITS = [10, 25, 50] as const;

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

export function Leaderboards(props: {
  metric: LeaderMetric;
  onMetric: (m: LeaderMetric) => void;
  limit: number;
  onLimit: (n: number) => void;
  rows: LeaderRow[];
  total: number;
  branchName: (code: string) => string;
  periodWord: string;
  scopeName: string | null;
}) {
  const tab = LEADER_TABS.find((t) => t.key === props.metric) ?? LEADER_TABS[0]!;
  const max = Math.max(...props.rows.map((r) => r.value), 0) || 1;

  return (
    <Card
      title="Leaderboards"
      subtitle={`${tab.blurb} this ${props.periodWord}${props.scopeName ? ` at ${props.scopeName}` : ''}, highest to lowest`}
      aside={
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
      }
    >
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

      {props.rows.length === 0 ? (
        <Empty>
          {props.metric === 'redeemed' ? 'No sukis used points in this period.' : 'No suki purchases in this period.'}
        </Empty>
      ) : (
        <>
          <ol className="leaders" role="tabpanel">
            {props.rows.map((r) => (
              <li key={r.member} className={r.rank <= 3 ? `leader leader-top leader-${r.rank}` : 'leader'}>
                <span className="leader-rank">{r.rank}</span>
                <span className="avatar avatar-sm">{initials(r.name)}</span>
                <div className="leader-main">
                  <div className="leader-top-line">
                    <span className="leader-name">
                      <strong>{r.name}</strong>
                      <span className="muted small"> {maskCard(r.member)} · {props.branchName(r.branch)}</span>
                    </span>
                    <strong className="num leader-value">
                      {fmtValue(props.metric, r.value)}
                      {tab.unit && <span className="muted small"> {tab.unit}</span>}
                    </strong>
                  </div>
                  <Bar pct={(r.value / max) * 100} />
                  <span className="muted small">{detail(props.metric, r)}</span>
                </div>
              </li>
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
