# Bolt's Journal - Critical Learnings

## 2025-05-14 - Supabase Data Fetching Waterfall
**Learning:** This codebase frequently uses sequential Supabase calls in `useEffect` or `useCallback` for independent widgets on pages like `ClassRecordingsPage` and `LuminaAcademyPage`. This creates a network waterfall that compounds latency, especially on mobile networks where initial page load feels sluggish.
**Action:** Use `Promise.all` to batch independent queries. Consider consolidating queries to the same table if filters can be combined, though batching is a safe first step.

## 2025-05-14 - Search Filtering Reactivity
**Learning:** Components like `ClassRecordingsPage` with large data sets and complex search/filter logic suffer from UI lag during input because they recalculate the entire filtered list on every keystroke.
**Action:** Always memoize search results and ensure `toLowerCase()` is only called once per query string.
