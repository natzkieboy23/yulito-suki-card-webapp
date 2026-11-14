import { WINBACK_DAYS } from '../config';
import type { WinBackRow } from '../data/metrics';
import { fmtInt, fmtPts } from '../lib/format';
import { Badge, Card, ComingSoon, Empty } from './ui';

export function RefillRadar() {
  return (
    <Card title="Refill radar" subtitle="Maintenance-med sukis due this week" aside={<Badge tone="up">2× pts if on time</Badge>}>
      <ComingSoon needs="Needs maintenance-medication refill schedules per suki (item, quantity, last fill date). None are recorded in the database yet." />
    </Card>
  );
}

export function WinBack({ rows, branchName }: { rows: WinBackRow[]; branchName: (code: string) => string }) {
  return (
    <Card title="Win-back list" subtitle={`High-value sukis with no visit in ${WINBACK_DAYS}+ days`}>
      {rows.length === 0 ? (
        <Empty>No lapsed high-value sukis.</Empty>
      ) : (
        <ul className="winback">
          {rows.map((r) => (
            <li key={r.member}>
              <div className="winback-top">
                <span>
                  <strong>{r.name}</strong>
                  <span className="muted small block">
                    {branchName(r.branch)} · last visit {fmtInt(r.daysSince)} days ago
                  </span>
                </span>
                <span className="winback-pts">
                  <strong>{fmtPts(r.lifetimeEarned)}</strong>
                  <span className="muted small block">lifetime pts</span>
                </span>
              </div>
              <button className="btn-primary" disabled title="SMS is not connected yet">
                Send “we miss you” 2× points offer
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function Rewards({ count, points }: { count: number; points: number }) {
  return (
    <Card title="Most-claimed rewards" subtitle="Redemptions this period">
      <div className="redeem-summary">
        <div>
          <span className="kpi-value sm">{fmtInt(count)}</span>
          <span className="muted small block">redemptions</span>
        </div>
        <div>
          <span className="kpi-value sm">{fmtPts(points)}</span>
          <span className="muted small block">points redeemed</span>
        </div>
      </div>
      <ComingSoon needs="Per-reward ranking needs a rewards catalog (reward name, points cost) and a reward id on each redemption. Redemptions are currently stored only as points_redeemed." />
    </Card>
  );
}
