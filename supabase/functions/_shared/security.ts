import { createHmac, timingSafeEqual } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { Buffer } from "https://deno.land/std@0.168.0/node/buffer.ts";

/**
 * Verifies a webhook signature using a constant-time comparison to prevent timing attacks.
 * Throws an error if the secret is missing or if the signature is invalid.
 *
 * @param payload The raw request body.
 * @param signature The signature from the request header (as a hex string).
 * @param secret The webhook secret.
 * @param algorithm The HMAC algorithm to use (e.g., 'sha256', 'sha1').
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: "sha256" | "sha1" = "sha256"
): void {
  if (!secret) {
    console.error("Webhook secret is not configured. Denying request.");
    throw new Error("Webhook secret is not configured.");
  }

  if (!signature) {
    console.error("Missing webhook signature. Denying request.");
    throw new Error("Missing signature.");
  }

  try {
    const hmac = createHmac(algorithm, secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    const sig = Buffer.from(signature, "hex");
    const expectedSig = Buffer.from(expectedSignature, "hex");

    // Important: timingSafeEqual requires buffers of the same length.
    if (sig.byteLength !== expectedSig.byteLength) {
      console.error("Invalid webhook signature: length mismatch.");
      throw new Error("Invalid signature.");
    }

    if (!timingSafeEqual(sig, expectedSig)) {
      console.error("Invalid webhook signature.");
      throw new Error("Invalid signature.");
    }
  } catch (error) {
    // Catch errors from Buffer.from() if the signature is not valid hex
    console.error("Signature verification failed:", error);
    throw new Error("Signature verification failed.");
  }
}
