import { useState, type SyntheticEvent } from 'react';
import { HEATMAP_DAYS, HEATMAP_SLOTS, slotLabel, type Heatmap as HeatmapData } from '../data/metrics';
import { fmtPct, fmtPts } from '../lib/format';
import { Card, Empty } from './ui';

type Tip = { d: number; s: number; v: number; x: number; y: number; caret: number };

const DAY_LONG = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function slotRange(slot: number) {
  return `${slotLabel(slot)}–${slotLabel(slot + 1)}`;
}

export function Heatmap({ data }: { data: HeatmapData }) {
  const slots = Array.from({ length: HEATMAP_SLOTS }, (_, i) => i);
  const [tip, setTip] = useState<Tip | null>(null);
  const total = data.grid.reduce((sum, row) => sum + row.reduce((a, b) => a + b, 0), 0);
  // Anchor the tooltip above the cell; offsets are relative to .heat-wrap (position: relative).
  const show = (d: number, s: number, v: number) => (e: SyntheticEvent<HTMLElement>) => {
    const el = e.currentTarget;
    const wrapW = (el.offsetParent as HTMLElement | null)?.clientWidth ?? 0;
    const half = 92; // ≈ half the tooltip width; keeps it inside the card at the edges
    const cx = el.offsetLeft + el.offsetWidth / 2;
    const x = Math.min(Math.max(cx, half), Math.max(half, wrapW - half));
    setTip({ d, s, v, x, y: el.offsetTop, caret: cx - x });
  };
  const hide = () => setTip(null);
  return (
    <Card title="When sukis earn" aside={<span className="muted small">Points earned by day and time · darker = busier</span>}>
      {data.max === 0 ? (
        <Empty>No timed transactions in this period.</Empty>
      ) : (
        <>
          <div className="heat-wrap" onMouseLeave={hide}>
          <div className="heat" role="table" aria-label="Points earned by weekday and time">
            <span />
            {slots.map((s) => (
              <span key={s} className="heat-col muted small">
                {slotLabel(s)}
              </span>
            ))}
            {data.grid.map((row, d) => (
              <div key={d} className="heat-row" role="row">
                <span className="heat-day small">{HEATMAP_DAYS[d]}</span>
                {row.map((v, s) => {
                  const k = data.max ? v / data.max : 0;
                  return (
                    <span
                      key={s}
                      role="cell"
                      className={`heat-cell${tip?.d === d && tip.s === s ? ' heat-active' : ''}`}
                      style={{ ['--k' as string]: (0.08 + k * 0.92).toFixed(3) }}
                      aria-label={`${DAY_LONG[d]} ${slotRange(s)}: ${fmtPts(v)} pts`}
                      onMouseEnter={show(d, s, v)}
                      onClick={show(d, s, v)}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {tip && (
            <div className="heat-tip" role="tooltip" style={{ left: tip.x, top: tip.y, ['--caret' as string]: `${tip.caret}px` }}>
              <span className="heat-tip-when">
                {DAY_LONG[tip.d]} · {slotRange(tip.s)}
              </span>
              <strong className="heat-tip-pts">{fmtPts(tip.v)} pts</strong>
              <span className="heat-tip-share">
                {total ? fmtPct((tip.v / total) * 100, 1) : '0%'} of this period’s timed points
              </span>
              {tip.v === data.max && tip.v > 0 && <span className="heat-tip-tag">Busiest slot</span>}
            </div>
          )}
          </div>
          {data.peak && data.quiet && (
            <p className="insight small">
              💡 Peak earning is {DAY_LONG[data.peak.day]} {slotRange(data.peak.slot)}. Quietest slot:{' '}
              {DAY_LONG[data.quiet.day]} {slotRange(data.quiet.slot)} — try a “2× Suki Hour” there to spread out the queue.
            </p>
          )}
        </>
      )}
    </Card>
  );
}
