/** Row shapes as returned by Supabase (only the columns we select). */
export interface BranchRow {
  id: number;
  code: string;
  name: string;
}

export interface CustomerRow {
  membership_code: number;
  firstname: string | null;
  middlename: string | null;
  lastname: string | null;
}

export interface RawTxnRow {
  /** Text column, UTC, usually "YYYY-MM-DD HH:mm:ss"; some rows "…ffffff+00"; some null. */
  created_at: string | null;
  membership_id: string;
  customer_name: string | null;
  /** Usually a branch code (GP, TP…), sometimes a numeric branch_table.id, sometimes "UNKNOWN". */
  branch_id: string | null;
  transaction_id: string | null;
  points_earned: number | string | null;
  points_redeemed: number | string | null;
  /** Peso amount of the row, stored as text ("45.00"). */
  total_amount: number | string | null;
}

/** Normalized transaction row used by all metrics. */
export interface Txn {
  /** Manila wall-clock time encoded as epoch ms (read with getUTC* methods). null = unknown time. */
  t: number | null;
  member: string;
  name: string;
  /** Branch code, or UNASSIGNED. */
  branch: string;
  /** Visit key: transaction_id, or a per-row fallback when missing. */
  visit: string;
  earned: number;
  redeemed: number;
  /** Pesos spent on this row. */
  amount: number;
}

export interface Branch {
  code: string;
  name: string;
}

export type Period = 'week' | 'month' | 'year';

/** 'ALL' or a branch code. */
export type Scope = string;
export const ALL: Scope = 'ALL';
export const UNASSIGNED = 'UNASSIGNED';
