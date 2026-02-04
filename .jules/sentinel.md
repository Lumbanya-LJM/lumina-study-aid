## 2025-05-21 - Secure Edge Function Pattern
**Vulnerability:** The `get-user-emails` Edge Function was completely unauthenticated and used a service role key to fetch PII (emails) for any user ID provided in the request body.
**Learning:** Even internal utility functions must be authenticated and authorized if they are exposed as public HTTP endpoints. Using a service role key without checking the requester's identity is a major security risk.
**Prevention:** Always use `supabase.auth.getUser()` to verify the requester's identity and implement RBAC (Role-Based Access Control) using a shared security module. Limit the number of records returned in a single request to prevent bulk data harvesting.
