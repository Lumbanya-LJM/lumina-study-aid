## 2025-05-15 - Webhook Security Hardening
**Vulnerability:** Unauthenticated or weakly authenticated webhooks (Daily.co and Lenco) allowed potential database manipulation and spam.
**Learning:** Webhooks often lack signature verification by default in rapid development, and existing verification might use unsafe string comparison or "fail-open" logic.
**Prevention:** Always implement mandatory signature verification using constant-time comparison. Remove CORS from webhooks to reduce attack surface. Centralize security logic in a shared module.
