import type { ReactNode } from 'react';

export function Card({
  title,
  subtitle,
  aside,
  className = '',
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  aside?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={`card ${className}`}>
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="muted small">{subtitle}</p>}
        </div>
        {aside && <div className="card-aside">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

export type Tone = 'up' | 'down' | 'neutral' | 'warn';

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Sparkline({ values, width = 84, height = 30 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${(i * step).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`)
    .join(' ');
  return (
    <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path d={d} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function Bar({ pct, className = '' }: { pct: number; className?: string }) {
  return (
    <div className={`bar ${className}`}>
      <div className="bar-fill" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/** Placeholder for mock widgets whose data does not exist in Supabase yet. */
export function ComingSoon({ needs, children }: { needs: string; children?: ReactNode }) {
  return (
    <div className="coming-soon">
      <span className="badge badge-neutral">Coming soon</span>
      <p className="small">{needs}</p>
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty muted small">{children}</p>;
}
