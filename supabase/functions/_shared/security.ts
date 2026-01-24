// supabase/functions/_shared/security.ts

/**
 * Compares two strings in a way that is safe against timing attacks.
 *
 * A constant-time comparison algorithm is a method of comparing two strings
 * in a way that the time it takes to complete the comparison is constant,
 * regardless of whether the strings are equal or not. This is important for
 * security-sensitive applications, such as verifying webhook signatures,
 * where a non-constant-time comparison could be exploited by an attacker to
 * gain information about the secret key.
 *
 * This implementation is based on the one used in the popular `timing-safe-equal`
 * library.
 *
 * @param a The first string to compare.
 * @param b The second string to compare.
 * @returns `true` if the strings are equal, `false` otherwise.
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
