## 2025-05-22 - Unauthenticated PII Access in Edge Functions
**Vulnerability:** Supabase Edge Functions using the service role key to access Auth data without verifying the requester's identity or permissions.
**Learning:** Even when using a service role key for necessary administrative tasks, the function must still perform manual authentication (`auth.getUser()`) and authorization (RBAC) to prevent unauthorized access to sensitive data.
**Prevention:** Implement a shared security module to provide consistent authentication and authorization helpers across all Edge Functions.
