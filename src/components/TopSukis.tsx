import type { SukiRow } from '../data/metrics';
import { maskCard } from '../data/normalize';
import { ALL, type Branch, type Scope } from '../data/types';
import { fmtInt, fmtPct, fmtPts, initials } from '../lib/format';
import { Bar, Card, Empty } from './ui';

function TierPill({ row }: { row: SukiRow }) {
  return <span className={`pill ${row.status.tier.className}`}>{row.status.tier.name}</span>;
}

function streakText(n: number) {
  return n > 0 ? `${n}-wk streak` : 'no streak';
}

export function TopSukis(props: {
  rows: SukiRow[];
  branches: Branch[];
  branchName: (code: string) => string;
  filter: Scope;
  onFilter: (s: Scope) => void;
  periodWord: string;
}) {
  const { rows, branchName } = props;
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const chips: { key: Scope; label: string }[] = [{ key: ALL, label: 'All' }, ...props.branches.map((b) => ({ key: b.code, label: b.code }))];

  return (
    <Card
      title="Top sukis"
      subtitle={`Ranked by points earned this ${props.periodWord}`}
      aside={
        <div className="chips">
          {chips.map((c) => (
            <button
              key={c.key}
              className={`chip ${props.filter === c.key ? 'chip-dark' : ''}`}
              onClick={() => props.onFilter(c.key)}
              title={c.key === ALL ? 'All branches' : branchName(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>
      }
    >
      {rows.length === 0 ? (
        <Empty>No suki purchases in this period.</Empty>
      ) : (
        <>
          <div className="podium">
            {podium.map((r) => (
              <div key={r.member} className={`podium-card ${r.rank === 1 ? 'podium-first' : ''}`}>
                <div className="podium-top">
                  <span className="avatar">{initials(r.name)}</span>
                  <span className="podium-rank">#{r.rank}</span>
                </div>
                <strong className="podium-name">{r.name}</strong>
                <span className="small sub">
                  {branchName(r.branch)} · {r.status.tier.name} · {maskCard(r.member)}
                </span>
                <div className="podium-bottom">
                  <span className="podium-pts">{fmtPts(r.points)}</span>
                  <span className="small sub">
                    {fmtInt(r.visits)} visits · {streakText(r.streak)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {rest.length > 0 && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Suki</th>
                    <th>Branch</th>
                    <th>Tier</th>
                    <th className="num">Points</th>
                    <th className="num">Visits</th>
                    <th>Progress to next tier</th>
                  </tr>
                </thead>
                <tbody>
                  {rest.map((r) => (
                    <tr key={r.member}>
                      <td className="muted">{r.rank}</td>
                      <td>
                        <div className="suki-cell">
                          <span className="avatar avatar-sm">{initials(r.name)}</span>
                          <span>
                            <strong>{r.name}</strong>
                            <span className="muted small block">
                              {maskCard(r.member)} · {streakText(r.streak)}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td>{branchName(r.branch)}</td>
                      <td>
                        <TierPill row={r} />
                      </td>
                      <td className="num">
                        <strong>{fmtPts(r.points)}</strong>
                      </td>
                      <td className="num">{fmtInt(r.visits)}</td>
                      <td>
                        {r.status.next && r.status.progressPct !== null ? (
                          <div className="progress">
                            <Bar pct={r.status.progressPct} className="bar-sm" />
                            <span className="muted small">
                              {fmtPct(r.status.progressPct)} to {r.status.next.name}
                            </span>
                          </div>
                        ) : (
                          <span className="muted small">Top tier</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
