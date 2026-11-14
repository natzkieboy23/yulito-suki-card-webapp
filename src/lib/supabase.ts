import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env.local.');
}

/** Read-only dashboard client. Anon key only — never the service_role key. */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const PAGE_SIZE = 1000; // PostgREST default max rows per request
const CONCURRENCY = 6;

/**
 * Fetch every row of a table by paging in parallel (ordered by id so pages are stable).
 * Fine at ~30k rows (≈2 s). If tables grow much larger, move aggregation into SQL RPCs.
 */
export async function fetchAll<T>(table: string, columns: string): Promise<T[]> {
  const { count, error } = await supabase.from(table).select('id', { count: 'exact', head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  const pages = Math.ceil((count ?? 0) / PAGE_SIZE);
  const results: T[][] = new Array(pages);
  let next = 0;

  async function worker() {
    while (next < pages) {
      const p = next++;
      const from = p * PAGE_SIZE;
      const { data, error: e } = await supabase
        .from(table)
        .select(columns)
        .order('id', { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (e) throw new Error(`${table}: ${e.message}`);
      results[p] = data as T[];
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, pages) }, worker));
  return results.flat();
}
