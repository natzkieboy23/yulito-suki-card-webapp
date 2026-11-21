import { useEffect, useRef, useState, type ReactNode } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Tweens a number toward `target` (ease-out cubic). Starts from 0 on mount and from the
 * last shown value on change, so switching period visibly morphs old → new.
 */
export function useCountUp(target: number, duration = 700): number {
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? target : 0));
  const from = useRef(shown);
  useEffect(() => {
    if (prefersReducedMotion() || !Number.isFinite(target)) {
      from.current = target;
      setShown(target);
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const v = origin + (target - origin) * (1 - Math.pow(1 - p, 3));
      from.current = v;
      setShown(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return shown;
}

/** Animated figure; screen readers get only the final value. */
export function AnimatedNumber({ value, format }: { value: number; format: (n: number) => string }) {
  const shown = useCountUp(value);
  return (
    <>
      <span aria-hidden>{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}

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
      {/* pathLength=1 lets CSS draw the line in; key re-runs the draw when the data changes */}
      <path key={d} d={d} pathLength={1} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
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
