import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Verifies a webhook signature using HMAC-SHA256.
 * Throws an error if the secret is missing or if the signature is invalid.
 *
 * @param {string} payload - The raw request body.
 * @param {string} signature - The signature from the request header.
 * @param {string} secret - The webhook secret.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): void {
  if (!secret) {
    throw new Error("Webhook secret is not configured. Cannot verify signature.");
  }

  const hmac = createHmac("sha256", secret);
  hmac.update(payload);
  const expectedSignature = hmac.digest("hex");

  if (signature !== expectedSignature) {
    throw new Error("Invalid webhook signature.");
  }
}
