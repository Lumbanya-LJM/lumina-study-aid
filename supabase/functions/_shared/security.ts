import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

/**
 * Verifies the signature of a webhook request.
 *
 * @param payload The raw request body.
 * @param signature The signature from the request header.
 * @param secret The webhook secret.
 * @param algorithm The HMAC algorithm to use (defaults to 'sha256').
 * @returns True if the signature is valid, false otherwise.
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm = "sha256"
): boolean {
  if (!secret) {
    // Fail securely if the secret is not configured
    console.error("Webhook secret is not configured. Rejecting request.");
    return false;
  }

  try {
    const hmac = createHmac(algorithm, secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest("hex");

    // Use a timing-safe comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }

    const signatureBuffer = new TextEncoder().encode(signature);
    const expectedSignatureBuffer = new TextEncoder().encode(expectedSignature);

    let constantTimeComparison = 0;
    for (let i = 0; i < signatureBuffer.length; i++) {
      constantTimeComparison |= signatureBuffer[i] ^ expectedSignatureBuffer[i];
    }
    return constantTimeComparison === 0;

  } catch (error) {
    console.error("Error during signature verification:", error);
    return false;
  }
}
