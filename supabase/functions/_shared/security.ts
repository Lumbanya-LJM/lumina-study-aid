import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { timingSafeEqual } from "https://deno.land/std@0.168.0/crypto/timing_safe_equal.ts";

/**
 * Verifies the signature of a webhook request.
 * Throws an error if the signature is invalid or the secret is missing.
 * @param payload The raw request body.
 * @param signature The signature from the request header.
 * @param secret The webhook secret.
 * @param algorithm The HMAC algorithm to use (e.g., "sha256", "sha1").
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha1" = "sha256"
): void {
  if (!secret) {
    throw new Error("Webhook secret is not configured. Cannot verify signature.");
  }

  if (!signature) {
    throw new Error("Missing webhook signature.");
  }

  try {
    const hmac = createHmac(algorithm, secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    const encoder = new TextEncoder();
    const sig = encoder.encode(signature);
    const expSig = encoder.encode(expectedSignature);

    if (!timingSafeEqual(sig, expSig)) {
      throw new Error("Invalid webhook signature.");
    }
  } catch (error) {
    console.error("Signature verification error:", error);
    throw new Error("Failed to verify webhook signature.");
  }
}
