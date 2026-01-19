import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Verifies the signature of a Lenco webhook.
 * @param payload The raw request body.
 * @param signature The signature from the 'x-lenco-signature' header.
 * @param secret The webhook secret.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyLencoSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.error("Lenco webhook secret is not configured.");
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return signature === expectedSignature;
  } catch (error) {
    console.error("Lenco signature verification error:", error);
    return false;
  }
}

/**
 * Verifies the signature of a Daily.co webhook.
 * @param payload The raw request body.
 * @param signature The signature from the 'daily-signature' header.
 * @param secret The webhook secret.
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyDailySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.error("Daily.co webhook secret is not configured.");
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return signature === `sha256=${expectedSignature}`;
  } catch (error) {
    console.error("Daily.co signature verification error:", error);
    return false;
  }
}
