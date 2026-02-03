## 2025-05-14 - Securing Public Edge Functions
**Vulnerability:** Publicly accessible Supabase Edge Functions using the service role key can leak PII (e.g., user emails) if they don't perform manual authentication and authorization checks.
**Learning:** Edge Functions that use the service role key bypass RLS. They must manually verify the requester's identity using `supabase.auth.getUser(jwt)` and then perform RBAC checks against custom tables or roles.
**Prevention:** Use a shared security module to standardize `validateUser` and `checkAdminOrTutor` across all sensitive Edge Functions. Always return generic error messages in catch blocks to avoid leaking internal details.
