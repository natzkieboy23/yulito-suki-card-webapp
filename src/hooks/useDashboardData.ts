import { useCallback, useEffect, useRef, useState } from 'react';
import { REFRESH_MS, TZ_OFFSET_HOURS } from '../config';
import { buildNameMap, normalizeTxns } from '../data/normalize';
import type { Branch, BranchRow, CustomerRow, RawTxnRow, Txn } from '../data/types';
import { fetchAll, supabase } from '../lib/supabase';

export interface DashboardData {
  branches: Branch[];
  txns: Txn[];
  names: Map<string, string>;
  /** UTC ms when the data was loaded. */
  loadedAt: number;
}

type State =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: DashboardData; error: null }
  | { status: 'error'; data: DashboardData | null; error: string };

async function load(): Promise<DashboardData> {
  const [branchRes, customers, rawTxns] = await Promise.all([
    supabase.from('branch_table').select('id, code, name').order('id'),
    fetchAll<CustomerRow>('customer_table', 'membership_code, firstname, middlename, lastname'),
    fetchAll<RawTxnRow>(
      'membership_points_table',
      'created_at, membership_id, customer_name, branch_id, transaction_id, points_earned, points_redeemed, total_amount',
    ),
  ]);
  if (branchRes.error) throw new Error(`branch_table: ${branchRes.error.message}`);
  const branchRows = branchRes.data as BranchRow[];
  return {
    branches: branchRows.map((b) => ({ code: b.code, name: b.name })),
    txns: normalizeTxns(rawTxns, branchRows, TZ_OFFSET_HOURS),
    names: buildNameMap(customers),
    loadedAt: Date.now(),
  };
}

export function useDashboardData() {
  const [state, setState] = useState<State>({ status: 'loading', data: null, error: null });
  const [refreshing, setRefreshing] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setRefreshing(true);
    try {
      const data = await load();
      setState({ status: 'ready', data, error: null });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setState((s) => ({ status: 'error', data: s.data, error: msg }));
    } finally {
      inFlight.current = false;
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [refresh]);

  return { ...state, refreshing, refresh };
}
