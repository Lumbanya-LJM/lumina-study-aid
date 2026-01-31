## 2026-01-31 - [Optimizing react-markdown with memoization]
**Learning:** In `react-markdown`, passing an inline object literal to the `components` prop causes the entire markdown tree to re-mount on every prop update (e.g., during AI streaming). This is because `ReactMarkdown` sees a new reference for `components` on every render.
**Action:** Always memoize the `components` object using `useMemo` or define it as a static constant outside the component. Combine this with `React.memo` on the wrapper component to prevent unnecessary re-renders of stable content.
