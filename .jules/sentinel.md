## 2025-05-22 - Exposed Edge Function PII Leak
**Vulnerability:** The `get-user-emails` edge function lacked authentication and authorization checks. It could be called by anyone with a list of user IDs to retrieve sensitive PII (emails) from the auth schema.
**Learning:** Edge functions using the service role key bypass RLS and need manual authentication checks using the user's JWT.
**Prevention:** Always verify the requester's identity using `supabase.auth.getUser()` and implement role-based access control (RBAC) in edge functions that handle sensitive data.
