import type { Period } from '../data/types';
import { fmtTime } from '../lib/format';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
];

export function Header(props: {
  branchCount: number;
  period: Period;
  onPeriod: (p: Period) => void;
  scopeName: string | null;
  onClearScope: () => void;
  periodLabel: string;
  loadedAt: number | null;
  refreshing: boolean;
  onRefresh: () => void;
  onExport: () => void;
}) {
  return (
    <header className="top">
      <div className="top-row">
        <div className="brand">
          <div className="logo" aria-hidden>
            <svg viewBox="0 0 24 24" width="20" height="20">
              <rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1>Suki Points</h1>
            <p className="muted small">Yulito Pharmacy · {props.branchCount} branches · live data</p>
          </div>
        </div>
        <div className="controls">
          <div
            className="segmented"
            role="tablist"
            aria-label="Period"
            style={{ ['--i' as string]: Math.max(0, PERIODS.findIndex((p) => p.key === props.period)) }}
          >
            {/* one pill that slides under the active option */}
            <span className="seg-indicator" aria-hidden />
            {PERIODS.map((p) => (
              <button
                key={p.key}
                role="tab"
                aria-selected={props.period === p.key}
                className={props.period === p.key ? 'active' : ''}
                onClick={() => props.onPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          <button className="btn-outline" onClick={props.onRefresh} disabled={props.refreshing}>
            {props.refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <button className="btn-outline" onClick={props.onExport}>
            ⤓ Export
          </button>
        </div>
      </div>
      <div className="scope-row small">
        {props.scopeName ? (
          <button className="chip chip-active" onClick={props.onClearScope} title="Show all branches">
            <span className="dot" key={props.loadedAt ?? 0} /> {props.scopeName} ✕
          </button>
        ) : (
          <span className="chip">
            <span className="dot" key={props.loadedAt ?? 0} /> All {props.branchCount} branches
          </span>
        )}
        <span className="muted">{props.periodLabel}</span>
        {props.loadedAt && <span className="muted">· updated {fmtTime(props.loadedAt)}</span>}
      </div>
    </header>
  );
}
