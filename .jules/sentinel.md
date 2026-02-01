## 2025-05-15 - [CRITICAL] PII Leak in Edge Function
**Vulnerability:** The `get-user-emails` Edge Function was exposed to the public without authentication, allowing any user (or non-user) to fetch user emails by providing user IDs. This used a `service_role` client, bypassing all RLS.
**Learning:** Supabase Edge Functions do not automatically enforce authentication. Using the `service_role` key inside a function without verifying the caller's JWT creates a major security hole.
**Prevention:** Always verify the caller's JWT using `supabase.auth.getUser()` before performing privileged operations. Implement explicit RBAC checks (e.g., checking a `user_roles` table) when using the `service_role` client.
