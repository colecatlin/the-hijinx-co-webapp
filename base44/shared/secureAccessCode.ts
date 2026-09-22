/**
 * Cryptographically secure access/invitation code generator.
 *
 * Replaces the previous Math.random-based generators (CWE-338).
 * Uses crypto.getRandomValues for CSPRNG-grade entropy.
 * Returns an 8-digit numeric string (preserves the existing format).
 */
export function generateSecureNumericCode(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  // 90,000,000 possible values (10000000–99999999)
  const num = 10000000 + (bytes[0] % 90000000);
  return num.toString();
}