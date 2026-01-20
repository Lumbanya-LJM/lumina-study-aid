// supabase/functions/_shared/security.ts
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";

/**
 * Verifies a webhook signature in a secure, constant-time manner.
 *
 * @param body - The raw request body string.
 * @param signature - The signature from the request header.
 * @param secret - The webhook secret.
 * @param algorithm - The HMAC algorithm (e.g., 'sha256', 'sha512').
 * @returns {boolean} - True if the signature is valid.
 * @throws {Error} - If the secret is missing or signature format is invalid.
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha512" = "sha256"
): boolean {
  if (!secret) {
    throw new Error("Webhook secret is not configured. Cannot verify signature.");
  }

  if (!signature) {
    return false; // No signature provided
  }

  try {
    const hmac = createHmac(algorithm, secret);
    hmac.update(body);
    const expectedSignature = hmac.digest("hex");

    const encoder = new TextEncoder();
    const expected = encoder.encode(expectedSignature);
    const actual = encoder.encode(signature);

    // Use constant-time comparison to prevent timing attacks
    return timingSafeEqual(expected, actual);
  } catch (error) {
    console.error("Error during webhook signature verification:", error);
    return false;
  }
}
