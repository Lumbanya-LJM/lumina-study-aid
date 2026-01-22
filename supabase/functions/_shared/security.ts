import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Verifies a webhook signature using a constant-time comparison to prevent timing attacks.
 *
 * @param payload The raw request body.
 * @param signature The signature from the request header.
 * @param secret The webhook secret.
 * @param algorithm The HMAC algorithm to use (e.g., "sha256", "sha1").
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha1"
): boolean {
  if (!secret) {
    // Fail securely if the secret is not configured.
    console.error(`${algorithm.toUpperCase()} webhook secret is not configured. Rejecting request.`);
    return false;
  }

  try {
    const hmac = createHmac(algorithm, secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    // Use a constant-time comparison to prevent timing attacks.
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    let a = 0;
    for (let i = 0; i < signature.length; i++) {
      a |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return a === 0;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
