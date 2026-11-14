import type { Period } from './types';

/**
 * All "local" times are Manila wall-clock encoded as epoch ms, so the getUTC* methods
 * return Manila fields. This keeps day/week/month math independent of the browser's timezone.
 */
export const HOUR_MS = 3_600_000;
export const DAY_MS = 24 * HOUR_MS;
export const WEEK_MS = 7 * DAY_MS;

export function toLocal(utcMs: number, offsetHours: number): number {
  return utcMs + offsetHours * HOUR_MS;
}

export function startOfDay(t: number): number {
  return Math.floor(t / DAY_MS) * DAY_MS;
}

/** Monday 00:00 of t's week. */
export function startOfWeek(t: number): number {
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  return startOfDay(t) - dow * DAY_MS;
}

export function startOfMonth(t: number): number {
  const d = new Date(t);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1);
}

export function startOfYear(t: number): number {
  return Date.UTC(new Date(t).getUTCFullYear(), 0, 1);
}

export interface Range {
  /** inclusive */
  start: number;
  /** exclusive */
  end: number;
}

export interface Bucket extends Range {
  label: string;
}

export interface PeriodRanges {
  current: Range;
  /** Same elapsed length, one period earlier (e.g. month-to-date vs same days last month). */
  previous: Range;
  /** Sparkline buckets covering the current range. */
  buckets: Bucket[];
  label: string;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dailyBuckets(start: number, end: number): Bucket[] {
  const out: Bucket[] = [];
  for (let d = start; d < end; d += DAY_MS) {
    const dt = new Date(d);
    out.push({ start: d, end: Math.min(d + DAY_MS, end), label: `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCDate()}` });
  }
  return out;
}

export function periodRanges(now: number, period: Period): PeriodRanges {
  const end = now + 1;
  const nowDate = new Date(now);
  const year = nowDate.getUTCFullYear();
  let start: number;
  let prevStart: number;
  let buckets: Bucket[];
  let label: string;

  if (period === 'week') {
    start = startOfWeek(now);
    prevStart = start - WEEK_MS;
    buckets = dailyBuckets(start, end);
    const s = new Date(start);
    label = `Week of ${MONTHS[s.getUTCMonth()]} ${s.getUTCDate()}, ${s.getUTCFullYear()}`;
  } else if (period === 'month') {
    start = startOfMonth(now);
    prevStart = Date.UTC(year, nowDate.getUTCMonth() - 1, 1);
    buckets = dailyBuckets(start, end);
    label = `${MONTHS_LONG[nowDate.getUTCMonth()]} ${year}, month to date`;
  } else {
    start = startOfYear(now);
    prevStart = Date.UTC(year - 1, 0, 1);
    buckets = [];
    for (let m = 0; m <= nowDate.getUTCMonth(); m++) {
      buckets.push({
        start: Date.UTC(year, m, 1),
        end: Math.min(Date.UTC(year, m + 1, 1), end),
        label: MONTHS[m] ?? '',
      });
    }
    label = `${year}, year to date`;
  }

  const prevEnd = Math.min(prevStart + (end - start), start);
  return { current: { start, end }, previous: { start: prevStart, end: prevEnd }, buckets, label };
}

export function inRange(t: number | null, r: Range): t is number {
  return t !== null && t >= r.start && t < r.end;
}
