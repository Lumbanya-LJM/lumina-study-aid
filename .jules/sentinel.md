## 2025-05-15 - Secured get-user-emails Edge Function
**Vulnerability:** The `get-user-emails` Edge Function was a public endpoint with no authentication or authorization, allowing anyone to leak user emails by providing user IDs.
**Learning:** Supabase Edge Functions using the service role key bypass RLS and require manual authentication via `supabase.auth.getUser(jwt)` and explicit RBAC checks.
**Prevention:** Always verify the caller's identity and roles when an Edge Function accesses sensitive data (PII) using the admin API. Limit batch sizes for input arrays to prevent resource exhaustion.
