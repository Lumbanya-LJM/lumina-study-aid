import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * A constant-time string comparison function to prevent timing attacks.
 *
 * @param a The first string to compare.
 * @param b The second string to compare.
 * @returns `true` if the strings are equal, `false` otherwise.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Verifies the signature of a Daily.co webhook.
 *
 * @param payload The raw request body.
 * @param signature The value of the `daily-signature` header.
 * @param secret The webhook secret.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyDailySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.error("DAILY_WEBHOOK_SECRET is not configured. Rejecting request.");
    return false;
  }

  try {
    const hmac = createHmac("sha1", secret);
    hmac.update(payload);
    const expectedSignature = `sha1=${hmac.digest("hex")}`;
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error("Daily signature verification error:", error);
    return false;
  }
}

/**
 * Verifies the signature of a Lenco webhook.
 *
 * @param payload The raw request body.
 * @param signature The value of the `x-lenco-signature` header.
 * @param secret The webhook secret.
 * @returns `true` if the signature is valid, `false` otherwise.
 */
export function verifyLencoSignature(payload: string, signature: string, secret: string): boolean {
  if (!secret) {
    console.error("LENCO_WEBHOOK_SECRET is not configured. Rejecting request.");
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error("Lenco signature verification error:", error);
    return false;
  }
}
