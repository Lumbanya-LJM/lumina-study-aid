// supabase/functions/_shared/security.ts

/**
 * Performs a constant-time comparison between two strings to prevent timing attacks.
 * @param a The first string.
 * @param b The second string.
 * @returns True if the strings are equal, false otherwise.
 */
function timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return diff === 0;
  }

/**
 * Verifies the signature of a Daily.co webhook request.
 * @param request The incoming request object.
 * @param secret The webhook secret.
 * @returns A promise that resolves to true if the signature is valid, false otherwise.
 */
export async function verifyDailySignature(request: Request, secret: string): Promise<boolean> {
    const signatureHeader = request.headers.get('X-Webhook-Signature');
    const timestampHeader = request.headers.get('X-Webhook-Timestamp');

    if (!signatureHeader || !timestampHeader) {
        console.warn("Missing required signature headers");
        return false;
    }

    const requestBody = await request.text();
    const signedPayload = `${timestampHeader}.${requestBody}`;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));

    // Convert ArrayBuffer to hex string
    const hexSignature = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

    return timingSafeEqual(hexSignature, signatureHeader);
}
