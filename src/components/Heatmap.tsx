import { HEATMAP_DAYS, HEATMAP_SLOTS, slotLabel, type Heatmap as HeatmapData } from '../data/metrics';
import { fmtPts } from '../lib/format';
import { Card, Empty } from './ui';

const DAY_LONG = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function slotRange(slot: number) {
  return `${slotLabel(slot)}–${slotLabel(slot + 1)}`;
}

export function Heatmap({ data }: { data: HeatmapData }) {
  const slots = Array.from({ length: HEATMAP_SLOTS }, (_, i) => i);
  return (
    <Card title="When sukis earn" aside={<span className="muted small">Points earned by day and time · darker = busier</span>}>
      {data.max === 0 ? (
        <Empty>No timed transactions in this period.</Empty>
      ) : (
        <>
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
                      className="heat-cell"
                      style={{ ['--k' as string]: (0.08 + k * 0.92).toFixed(3) }}
                      title={`${DAY_LONG[d]} ${slotRange(s)}: ${fmtPts(v)} pts`}
                    />
                  );
                })}
              </div>
            ))}
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
