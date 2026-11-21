import { HEALTHY_REDEMPTION, POINT_VALUE_PESOS } from '../config';
import type { Kpis } from '../data/metrics';
import { fmtDelta, fmtInt, fmtPct, fmtPeso, fmtPts } from '../lib/format';
import { AnimatedNumber, Badge, Sparkline, type Tone } from './ui';

const deltaTone = (d: number | null): Tone => (d === null ? 'neutral' : d >= 0 ? 'up' : 'down');

function Kpi(props: {
  label: string;
  value: number;
  format: (n: number) => string;
  badge: string;
  tone: Tone;
  sub: string;
  spark: number[];
}) {
  return (
    <div className="card kpi">
      <div className="kpi-head">
        <span className="small">{props.label}</span>
        <Badge tone={props.tone}>{props.badge}</Badge>
      </div>
      <div className="kpi-body">
        <span className="kpi-value">
          <AnimatedNumber value={props.value} format={props.format} />
        </span>
        <Sparkline values={props.spark} />
      </div>
      <p className="muted small">{props.sub}</p>
    </div>
  );
}

export function KpiRow({ k }: { k: Kpis }) {
  const rate = k.redeemed.ratePct;
  // Judge on the rounded value shown, so "30% rate" never reads as out of range.
  const shown = rate === null ? null : Math.round(rate);
  const healthy = shown !== null && shown >= HEALTHY_REDEMPTION.min && shown <= HEALTHY_REDEMPTION.max;
  return (
    <div className="kpis">
      <Kpi
        label="Points issued"
        value={k.issued.value}
        format={fmtPts}
        badge={fmtDelta(k.issued.deltaPct)}
        tone={deltaTone(k.issued.deltaPct)}
        sub={`${fmtPeso(k.issued.value * POINT_VALUE_PESOS)} in rewards value earned`}
        spark={k.issued.spark}
      />
      <Kpi
        label="Points redeemed"
        value={k.redeemed.value}
        format={fmtPts}
        badge={rate === null ? '— rate' : `${fmtPct(rate)} rate`}
        tone={rate === null ? 'neutral' : healthy ? 'up' : 'warn'}
        sub={`Healthy range is ${HEALTHY_REDEMPTION.min}–${HEALTHY_REDEMPTION.max}% of points issued`}
        spark={k.redeemed.spark}
      />
      <Kpi
        label="Active sukis"
        value={k.active.value}
        format={fmtInt}
        badge={fmtDelta(k.active.deltaPct)}
        tone={deltaTone(k.active.deltaPct)}
        sub="Members with at least one purchase this period"
        spark={k.active.spark}
      />
      <Kpi
        label="Unredeemed balance"
        value={k.balance.value * POINT_VALUE_PESOS}
        format={fmtPeso}
        badge="Watch"
        tone="warn"
        sub={`Points owed to sukis at ${fmtPeso(POINT_VALUE_PESOS)} per point`}
        spark={k.balance.spark}
      />
    </div>
  );
}
