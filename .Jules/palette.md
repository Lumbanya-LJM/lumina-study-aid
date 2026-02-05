## 2025-05-15 - [Playwright get_by_label strict mode violation]
**Learning:** Playwright's `get_by_label` locator matches both associated `<label>` text and `aria-label` attributes. In forms where an icon button (e.g., password toggle) has an `aria-label` similar to the input's label, this causes 'strict mode violation' errors.
**Action:** Use `exact=True` or `get_by_role` to disambiguate when selecting elements with potentially overlapping labels and aria-labels.
