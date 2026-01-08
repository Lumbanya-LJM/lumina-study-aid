## 2024-07-16 - Webhook Signature Bypass
**Vulnerability:** A critical vulnerability was discovered in the `payment-webhook` Supabase Edge Function. If the `LENCO_WEBHOOK_SECRET` environment variable was not configured, the function would completely skip the cryptographic signature verification of incoming webhook requests.

**Learning:** This vulnerability existed because the system was designed with a "fail-open" approach, likely to simplify local development where environment variables might not be set. An attacker could have exploited this by sending a forged webhook request to the endpoint, simulating a successful payment and gaining access to paid features without authorization. This highlights the danger of creating permissive fallbacks in security-critical code paths.

**Prevention:** To prevent this pattern from recurring, all webhook handlers and security-sensitive endpoints must be designed with a "fail-secure" principle. The absence of a required secret or token must always be treated as a critical error that immediately halts the request with an unauthorized status. Signature verification is not optional and must be strictly enforced in all environments.
