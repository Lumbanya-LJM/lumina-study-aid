# Bolt's Performance Journal

## 2026-01-31 - [ReactMarkdown Rendering Optimization]
**Learning:** In `react-markdown`, defining the `components` prop as an inline object literal or defining component functions inside the render loop causes full re-mounting of all markdown elements on every prop update. This is particularly noticeable during AI streaming where the `content` prop updates frequently.
**Action:** Always memoize the components object using `useMemo` or a static definition outside the component, and wrap the renderer in `React.memo` to prevent unnecessary re-renders when parent state changes.
