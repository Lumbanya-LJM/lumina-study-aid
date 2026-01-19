import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Verifies a webhook signature using HMAC SHA256.
 *
 * @param payload The raw request body.
 * @param signature The signature from the request header.
 * @param secret The webhook secret.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret) {
    console.error("Webhook secret is not configured. Signature verification failed.");
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature;
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
