## 2025-05-14 - Accessible Icon-Only Buttons
**Learning:** Icon-only buttons are common in this codebase for actions like toggling password visibility, closing modals, or navigating back. These frequently lack `aria-label` and `focus-visible` styles, making them difficult for screen reader and keyboard users to identify and use.
**Action:** Always check for `aria-label` and focus states on any button that does not contain descriptive text. Use dynamic labels where state changes (e.g., "Show password" vs "Hide password").
