/** Points have 2-decimal precision; drop decimals once numbers are large enough not to need them. */
export function fmtPts(n: number): string {
  return n.toLocaleString('en-PH', { maximumFractionDigits: Math.abs(n) < 1000 ? 2 : 0 });
}

export function fmtInt(n: number): string {
  return Math.round(n).toLocaleString('en-PH');
}

export function fmtPeso(n: number): string {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(n: number, digits = 0): string {
  return `${n.toFixed(digits)}%`;
}

export function fmtDelta(n: number | null): string {
  if (n === null) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export function initials(name: string): string {
  const parts = name.split(' ').filter((p) => p && !p.endsWith('.'));
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '')).toUpperCase();
}

export function fmtTime(utcMs: number): string {
  return new Date(utcMs).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
}
