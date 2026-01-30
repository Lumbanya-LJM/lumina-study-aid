## 2025-05-14 - [Query Batching & Memoization]
**Learning:** Consolidating multiple Supabase queries into a single call using `.or()` filters significantly reduces network overhead and improves Page load speed. Using `useMemo` for categorized views of the same dataset prevents redundant filtering and sorting on every render.
**Action:** Always check for multiple queries to the same table in `useEffect` or `useCallback` hooks and consider batching them. Pair batching with `useMemo` to maintain clean derived views of the data.
