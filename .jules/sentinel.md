## 2025-05-15 - Unauthenticated PII Leak in Edge Functions
**Vulnerability:** The `get-user-emails` Edge Function was completely unauthenticated and allowed anyone with the URL to fetch user emails by providing a list of user IDs. It used the service role key to query Auth data without verifying the requester's identity or role.
**Learning:** Supabase Edge Functions that use the service role key bypass RLS and require manual authentication (`auth.getUser()`) and authorization checks.
**Prevention:** Always implement a shared security utility for Edge Functions and call it at the beginning of any function that handles sensitive data or performs privileged operations.
