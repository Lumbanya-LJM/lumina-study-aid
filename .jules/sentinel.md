## 2025-05-15 - [PII Leak in get-user-emails]
**Vulnerability:** The `get-user-emails` Edge Function was unauthenticated and used a service role key, allowing anyone to fetch any user's email address by providing their ID.
**Learning:** Many Edge Functions in this codebase follow a pattern of being unauthenticated while performing sensitive operations with administrative privileges. This is a recurring vulnerability pattern.
**Prevention:** Always verify the caller's JWT using `supabase.auth.getUser()` and implement explicit Role-Based Access Control (RBAC) checks before proceeding with operations that use the service role key or bypass RLS.
