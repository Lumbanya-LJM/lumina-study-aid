import { createHmac, timingSafeEqual } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Verifies a webhook signature using a constant-time comparison to prevent timing attacks.
 * @param algorithm - The HMAC algorithm to use (e.g., "sha256").
 * @param payload - The raw request body.
 * @param signature - The signature from the request header.
 * @param secret - The webhook secret.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(
  algorithm: "sha256" | "sha1",
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.error("Webhook secret is not configured. Signature verification failed.");
    return false; // Fail secure: if no secret, always fail.
  }

  try {
    const hmac = createHmac(algorithm, secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    const sigBuffer = new TextEncoder().encode(signature);
    const expectedSigBuffer = new TextEncoder().encode(expectedSignature);

    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(sigBuffer, expectedSigBuffer);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
