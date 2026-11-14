import { TIERS } from '../config';
import type { TierCount } from '../data/metrics';
import { fmtInt, fmtPct, fmtPts } from '../lib/format';
import { Card, ComingSoon } from './ui';

function rangeLabel(i: number): string {
  const t = TIERS[i]!;
  const above = TIERS[i - 1];
  if (!above) return `${fmtPts(t.min)}+ pts a year`;
  if (t.min === 0) return `Under ${fmtPts(above.min)} pts`;
  return `${fmtPts(t.min)}–${fmtPts(above.min - 0.01)} pts`;
}

export function TierLadder({ rows, total }: { rows: TierCount[]; total: number }) {
  return (
    <Card title="Tier ladder" subtitle="Suki tiers by yearly points (suggested thresholds)">
      <div className="stack" aria-hidden>
        {rows.map((r) => (r.count ? <div key={r.tier.name} className={r.tier.className} style={{ flexGrow: r.count }} /> : null))}
      </div>
      <ul className="tiers">
        {rows.map((r, i) => (
          <li key={r.tier.name}>
            <span className={`swatch ${r.tier.className}`} />
            <span className="tier-name">
              <strong>{r.tier.name}</strong>
              <span className="muted small">{rangeLabel(i)}</span>
            </span>
            <strong className="num">{fmtInt(r.count)}</strong>
            <span className="muted small num pct">{fmtPct(r.pct)}</span>
          </li>
        ))}
      </ul>
      <p className="muted small">{fmtInt(total)} sukis with purchases this year.</p>
      <div className="callout-warn">
        <strong className="small">◷ Points expiring in 30 days</strong>
        <ComingSoon needs="No points-expiry rule or expiry dates exist in the database yet. Add an expiry policy to show the value at risk here.">
          <button className="btn-warn" disabled title="SMS is not connected yet">
            Send expiry reminder SMS
          </button>
        </ComingSoon>
      </div>
    </Card>
  );
}
