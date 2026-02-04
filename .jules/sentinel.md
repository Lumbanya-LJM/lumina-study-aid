## 2025-05-22 - [Broken Authentication in Edge Functions]
**Vulnerability:** Several Supabase Edge Functions were exposed without any authentication or authorization checks, despite using the `service_role` key internally. This allowed any user to fetch student emails (PII) or send mass push notifications.
**Learning:** Edge Functions in Supabase are public by default. If they use the `service_role` key, they bypass RLS, making manual JWT verification (`auth.getUser()`) and RBAC checks absolutely mandatory for security.
**Prevention:** Implement a shared security utility for all Edge Functions that enforces `validateUser()` and `checkAdminOrTutor()` patterns.
