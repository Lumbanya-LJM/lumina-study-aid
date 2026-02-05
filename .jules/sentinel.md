# Sentinel Security Journal

## 2025-05-15 - Secured daily-room Edge Function
**Vulnerability:** The `daily-room` Edge Function was completely public, allowing anyone to create/delete rooms or generate owner tokens.
**Learning:** Supabase Edge Functions do not automatically validate JWTs; this must be explicitly implemented using `supabase.auth.getUser()`. Identity and role checks are essential for sensitive administrative actions.
**Prevention:** Always implement JWT validation and RBAC checks in Edge Functions that perform privileged operations. Use authenticated user IDs from the JWT rather than trusting the request body.
