import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Verifies an HMAC SHA256 signature for a webhook payload.
 *
 * @param {string} payload - The raw request body.
 * @param {string} signature - The signature from the request header.
 * @param {string} secret - The webhook secret.
 * @returns {boolean} - True if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) {
    console.error("Missing webhook secret or signature.");
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
