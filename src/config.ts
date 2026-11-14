/** Business rules for the dashboard. Change here, not in components. */

/** Asia/Manila is UTC+8 with no DST. Supabase timestamps are stored in UTC. */
export const TZ_OFFSET_HOURS = 8;

/** Peso value of one point (used for "rewards value" and liability figures). */
export const POINT_VALUE_PESOS = 1;

/** Members with no visit for this many days appear in the win-back list. */
export const WINBACK_DAYS = 45;

/** Healthy redemption rate band, as a % of points issued. */
export const HEALTHY_REDEMPTION = { min: 30, max: 50 } as const;

export interface Tier {
  name: string;
  /** Minimum calendar-year-to-date points to reach this tier. */
  min: number;
  className: string;
}

/**
 * Tier thresholds by yearly points, highest first.
 * Tuned to the real points scale (~0.25 pts per ₱100, i.e. 1 pt per ~₱400; p96 ≈ 50 pts/yr as of Nov 2026),
 * not the mock's 12,000-point example thresholds.
 */
export const TIERS: readonly Tier[] = [
  { name: 'Platinum', min: 100, className: 'tier-platinum' },
  { name: 'Gold', min: 40, className: 'tier-gold' },
  { name: 'Silver', min: 15, className: 'tier-silver' },
  { name: 'Regular', min: 0, className: 'tier-regular' },
];

/** Auto-refresh interval for live data. */
export const REFRESH_MS = 5 * 60 * 1000;
