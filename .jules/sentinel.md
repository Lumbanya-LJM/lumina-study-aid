## 2024-07-22 - Insecure Webhook 'Fail-Open' Vulnerability

**Vulnerability:** A critical vulnerability was identified in the `payment-webhook` Supabase Edge Function. The function was designed to bypass webhook signature verification if the `LENCO_WEBHOOK_SECRET` environment variable was not set. This created a "fail-open" condition where, in a misconfigured environment, the function would process unauthenticated and potentially malicious webhooks.

**Learning:** The root cause was a design flaw that prioritized development convenience over a secure-by-default posture. Allowing signature verification to be skipped is a critical security risk, as it enables attackers to spoof events (e.g., successful payments) by sending forged requests. A similar vulnerability, though less severe, was also noted in the `daily-webhook`, which lacked signature verification entirely.

**Prevention:** All publicly exposed webhook handlers **must** enforce signature verification. There should be no fallback or "development mode" that bypasses this check. The correct pattern is to "fail-secure":
1.  Check for the existence of the webhook secret.
2.  If the secret is missing, log a critical error and return an HTTP 500 error to reject the request immediately.
3.  If the secret is present, perform signature verification.
4.  If verification fails, return an HTTP 401 Unauthorized error.

This ensures that the system is secure by default and that any misconfiguration results in a safe failure mode rather than a security vulnerability.