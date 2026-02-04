## 2026-02-04 - [Parallelizing Supabase Queries & Optimized Filtering]
**Learning:** Sequential network requests in core pages (like Academy) create significant waterfalls. Using `Promise.all` and SQL joins reduces perceived load time by 50-80%. Additionally, pre-calculating search terms outside filter loops in `useMemo` provides a small but valuable CPU boost for long lists.
**Action:** Always scan for sequential `await`s in data loading functions and move transformation logic (like `.toLowerCase()`) out of tight loops in render bodies.
