import { toLocal } from './time';
import { UNASSIGNED, type BranchRow, type CustomerRow, type RawTxnRow, type Txn } from './types';

/**
 * Parse membership_points_table.created_at (a TEXT column holding UTC).
 * Accepts "2026-11-14 01:39:04", "2026-02-21 06:55:42.844112+00", ISO strings. Returns UTC ms or null.
 */
export function parseUtcText(s: string | null | undefined): number | null {
  if (!s) return null;
  let iso = s.trim().replace(' ', 'T');
  if (/[+-]\d\d$/.test(iso)) iso += ':00';
  else if (!/(Z|[+-]\d\d:?\d\d)$/i.test(iso)) iso += 'Z';
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
}

/**
 * membership_points_table.branch_id is inconsistent: mostly branch codes, but some rows hold
 * branch_table.id ("16") and some "UNKNOWN". Map everything to a branch code or UNASSIGNED.
 */
export function makeBranchResolver(branches: BranchRow[]): (raw: string | null) => string {
  const codes = new Set(branches.map((b) => b.code));
  const byId = new Map(branches.map((b) => [String(b.id), b.code]));
  return (raw) => {
    const v = (raw ?? '').trim();
    if (codes.has(v)) return v;
    return byId.get(v) ?? UNASSIGNED;
  };
}

export function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/(^|[\s\-'.])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

export function customerName(c: CustomerRow): string {
  const mid = c.middlename?.trim() ? `${c.middlename.trim().charAt(0)}.` : '';
  return titleCase([c.firstname, mid, c.lastname].filter(Boolean).join(' '));
}

export function maskCard(code: string): string {
  return `•••• ${code.slice(-4)}`;
}

function num(v: number | string | null): number {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function normalizeTxns(rows: RawTxnRow[], branches: BranchRow[], offsetHours: number): Txn[] {
  const resolve = makeBranchResolver(branches);
  return rows.map((r, i) => {
    const utc = parseUtcText(r.created_at);
    return {
      t: utc === null ? null : toLocal(utc, offsetHours),
      member: String(r.membership_id).trim(),
      name: titleCase(r.customer_name ?? ''),
      branch: resolve(r.branch_id),
      visit: r.transaction_id?.trim() || `row-${i}`,
      earned: num(r.points_earned),
      redeemed: num(r.points_redeemed),
      amount: num(r.total_amount),
    };
  });
}

/** membership_code → display name, from customer_table. */
export function buildNameMap(customers: CustomerRow[]): Map<string, string> {
  return new Map(customers.map((c) => [String(c.membership_code), customerName(c)]));
}
