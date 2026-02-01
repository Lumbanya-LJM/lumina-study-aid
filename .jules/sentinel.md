## 2026-02-01 - Securing PII data in Edge Functions
**Vulnerability:** The `get-user-emails` Edge Function lacked authentication and authorization, exposing student emails to anyone with the function URL and user IDs.
**Learning:** Functions that use the Supabase Service Role Key bypass RLS and require manual authentication via `supabase.auth.getUser(token)` and explicit RBAC checks.
**Prevention:** Always implement a dual-client pattern: one with the user's token for auth verification and one with the service key for privileged operations (only after auth/authz is confirmed).
