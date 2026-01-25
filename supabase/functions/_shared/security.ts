// supabase/functions/_shared/security.ts

/**
 * Performs a constant-time comparison of two strings to prevent timing attacks.
 * This is crucial for comparing cryptographic signatures or tokens.
 *
 * @param a The first string.
 * @param b The second string.
 * @returns `true` if the strings are equal, `false` otherwise.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  const aLen = a.length;
  const bLen = b.length;
  let result = 0;

  // This check is essential. If the lengths are different, we still need to
  // perform a comparison of the same length to avoid leaking length information.
  // We compare `a` with itself if lengths differ.
  const toCompare = aLen === bLen ? b : a;

  for (let i = 0; i < aLen; i++) {
    result |= a.charCodeAt(i) ^ toCompare.charCodeAt(i);
  }

  // Finally, include the length comparison in the result.
  return (aLen === bLen) && result === 0;
}
