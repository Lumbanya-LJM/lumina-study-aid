import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function timingSafeEqual(a: string, b: string): boolean {
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
 * Verifies an HMAC-SHA256 signature for a given payload and secret.
 */
export function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!secret || !signature) {
    return false;
  }

  try {
    const hmac = createHmac("sha256", secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");
    return timingSafeEqual(signature, expectedSignature);
  } catch (error) {
    console.error("Signature verification error:", error);
    return false;
  }
}
