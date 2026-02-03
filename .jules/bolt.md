## 2024-05-23 - [Network Waterfall Optimization]
**Learning:** Sequential Supabase queries in `useEffect` or `useCallback` create a network waterfall, significantly increasing page load time. Parallelizing them with `Promise.all` can reduce latency significantly.
**Action:** Always check for independent Supabase queries in data-heavy pages and parallelize them.
