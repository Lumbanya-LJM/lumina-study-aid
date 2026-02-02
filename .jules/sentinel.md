## 2025-05-22 - [Access Control in Edge Functions]
**Vulnerability:** Many Supabase Edge Functions were found to be lacking authentication and authorization, allowing any unauthenticated user to trigger them (e.g., `send-push-notification`).
**Learning:** Edge Functions called via `supabase.functions.invoke` automatically include the user's JWT, but the function itself must verify it using `supabase.auth.getUser(jwt)` and implement role-based access control (RBAC).
**Prevention:** Use a shared security module to provide `validateUser` and `checkAdminOrTutor` utilities and apply them to all sensitive endpoints.
