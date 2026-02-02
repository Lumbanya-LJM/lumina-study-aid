## 2024-05-23 - Route-based Code Splitting
**Learning:** The application had a massive initial bundle size (~2.1MB) due to static imports of over 40 pages and their large dependencies (recharts, react-markdown). Implementing route-based code splitting with `React.lazy` and `Suspense` reduced the main bundle size by ~70% (to ~642KB).
**Action:** Always check the main bundle size in large applications and prioritize lazy loading for non-critical routes to improve initial load performance. Use a consistent `PageLoader` component for `Suspense` fallbacks to ensure a smooth transition.
