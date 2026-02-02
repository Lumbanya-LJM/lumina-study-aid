## 2024-05-20 - [CRITICAL] PII Leakage in Edge Functions
**Vulnerability:** The `get-user-emails` Edge Function was wide open, allowing any unauthenticated caller to fetch user emails by providing user IDs. It used a service role key to bypass RLS without performing its own AuthN/AuthZ.
**Learning:** Supabase Edge Functions do not automatically enforce authentication. When using `service_role` keys, the handler MUST manually verify the user's JWT and perform role-based access control (RBAC).
**Prevention:** Always implement a shared security utility to validate JWTs and check roles. Never use privileged keys without explicit authorization checks in the code.
