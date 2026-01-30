## 2026-01-30 - Parallelizing Supabase Queries
**Learning:** Sequential `await` calls for independent Supabase queries are a common performance bottleneck in pages with multiple data widgets (like Dashboards or Academy pages). Parallelizing these with `Promise.all` can reduce network-bound loading time by 50-80% depending on the number of queries.
**Action:** Always check for independent `await supabase.from(...)` calls in `useEffect` or data-loading functions and consolidate them into `Promise.all`.
