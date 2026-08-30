/**
 * Creates a UUID v4 in both secure HTTPS contexts and
 * local-network HTTP contexts.
 *
 * crypto.randomUUID() is restricted to secure contexts
 * in browsers. crypto.getRandomValues() remains available
 * when TripSync is opened from another device over a LAN
 * address such as http://192.168.x.x:3000.
 */
export function createBrowserUuid() {
  const browserCrypto =
    globalThis.crypto;

  if (
    typeof browserCrypto ===
    "undefined"
  ) {
    throw new Error(
      "Secure random values are unavailable in this browser."
    );
  }

  if (
    typeof browserCrypto.randomUUID ===
    "function"
  ) {
    return browserCrypto.randomUUID();
  }

  if (
    typeof browserCrypto.getRandomValues !==
    "function"
  ) {
    throw new Error(
      "Secure random values are unavailable in this browser."
    );
  }

  const bytes =
    new Uint8Array(16);

  browserCrypto.getRandomValues(
    bytes
  );

  // RFC 4122 / UUID v4 bits.
  bytes[6] =
    (bytes[6] & 0x0f) |
    0x40;

  bytes[8] =
    (bytes[8] & 0x3f) |
    0x80;

  const hex =
    Array.from(
      bytes,
      (byte) =>
        byte
          .toString(16)
          .padStart(2, "0")
    ).join("");

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}