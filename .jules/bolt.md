# Bolt's Journal ⚡

This journal is for CRITICAL, codebase-specific performance learnings.

---
## 2024-07-22 - Unintended Dependency Changes

**Learning:** Running `bun install` to set up local tooling (like linters) can unintentionally modify the `bun.lock` file, adding new, unrelated dependencies to the project. This pollutes the commit and violates the principle of atomic changes.

**Action:** After running `bun install` for any reason, I must always check the status of `bun.lock`. If it has been modified unintentionally, I must revert the file to its original state using `restore_file bun.lock` before submitting my changes. This ensures that my commits remain focused and do not introduce unintended side effects.
