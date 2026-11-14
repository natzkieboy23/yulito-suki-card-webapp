import type { BranchStat } from '../data/metrics';
import type { Scope } from '../data/types';
import { fmtDelta, fmtInt, fmtPct, fmtPts } from '../lib/format';
import { Bar, Card } from './ui';

export function BranchRace(props: {
  rows: BranchStat[];
  unassigned: { earned: number; sharePct: number } | null;
  scope: Scope;
  onFocus: (code: string) => void;
}) {
  const max = Math.max(1, ...props.rows.map((r) => r.earned));
  return (
    <Card title="Branch race" aside={<span className="muted small">Points earned · tap a branch to focus the whole dashboard</span>}>
      <ol className="race">
        {props.rows.map((r, i) => {
          const focused = props.scope === r.code;
          const dimmed = props.scope !== 'ALL' && !focused;
          return (
            <li key={r.code}>
              <button
                className={`race-row ${focused ? 'focused' : ''} ${dimmed ? 'dimmed' : ''}`}
                onClick={() => props.onFocus(r.code)}
                aria-pressed={focused}
              >
                <span className={`rank ${i === 0 ? 'rank-first' : ''}`}>{i + 1}</span>
                <span className="race-main">
                  <span className="race-top">
                    <strong>{r.name}</strong>
                    <strong className="num">{fmtPts(r.earned)} pts</strong>
                  </span>
                  <Bar pct={(r.earned / max) * 100} />
                  <span className="race-meta muted small">
                    <span>{fmtInt(r.active)} active sukis</span>
                    <span>{fmtPts(r.ptsPerVisit)} pts per visit</span>
                    <span>{fmtPct(r.sharePct)} of all points</span>
                    {r.deltaPct !== null && (
                      <span className={r.deltaPct >= 0 ? 'up' : 'down'}>
                        {r.deltaPct >= 0 ? '▲' : '▼'} {fmtDelta(r.deltaPct)} vs last period
                      </span>
                    )}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {props.unassigned && props.unassigned.earned > 0 && (
        <p className="muted small footnote">
          + {fmtPts(props.unassigned.earned)} pts ({fmtPct(props.unassigned.sharePct)}) from transactions with no valid branch
          code.
        </p>
      )}
    </Card>
  );
}
