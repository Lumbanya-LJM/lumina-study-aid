## 2024-05-21 - Lenco Webhook Signature Verification Bypass

**Vulnerability:** The Lenco payment webhook in `supabase/functions/payment-webhook/index.ts` would bypass signature verification if the `LENCO_WEBHOOK_SECRET` environment variable was not set. This would allow an attacker to send unauthenticated, malicious payloads to the endpoint to spoof payments.

**Learning:** The code was written with a permissive fallback, likely to facilitate local development, but this created a "fail-open" scenario. In production, a missing secret should always result in a hard failure.

**Prevention:** All webhook handlers must adopt a "fail-secure" posture. Signature verification must be mandatory. The environment variable containing the webhook secret must be considered critical, and its absence should halt the execution of the function with an error.
