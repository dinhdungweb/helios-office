import { createHmac, randomBytes } from "node:crypto";

// Time-based one-time passwords (RFC 6238, HMAC-SHA1), as authenticator apps generate them.

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buffer: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

export function base32Decode(input: string) {
  const clean = input.toUpperCase().replace(/[\s=-]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const character of clean) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index === -1) throw new Error("Invalid base32 character");
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

// 160-bit secret, the size RFC 4226 recommends for HMAC-SHA1.
export function generateTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function timeStep(periodSeconds: number, now = Date.now()) {
  return Math.floor(now / 1000 / periodSeconds);
}

export function totpCode(secret: string, step: number, digits: number) {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const hmac = createHmac("sha1", base32Decode(secret)).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = (hmac.readUInt32BE(offset) & 0x7fffffff) % 10 ** digits;

  return binary.toString().padStart(digits, "0");
}

// The matching time step within ±`window` steps (clock drift), or null. Callers reject a step that
// is not newer than the last one accepted, so a code cannot be replayed.
export function verifyTotp(
  secret: string,
  code: string,
  options: { digits: number; periodSeconds: number; window?: number; now?: number }
) {
  if (!new RegExp(`^\\d{${options.digits}}$`).test(code)) return null;

  const current = timeStep(options.periodSeconds, options.now);
  const window = options.window ?? 1;

  for (let offset = -window; offset <= window; offset += 1) {
    if (totpCode(secret, current + offset, options.digits) === code) return current + offset;
  }

  return null;
}

export function otpauthUrl(options: { secret: string; account: string; issuer: string; digits: number; periodSeconds: number }) {
  const label = encodeURIComponent(`${options.issuer}:${options.account}`);
  const params = new URLSearchParams({
    secret: options.secret,
    issuer: options.issuer,
    algorithm: "SHA1",
    digits: String(options.digits),
    period: String(options.periodSeconds)
  });

  return `otpauth://totp/${label}?${params.toString()}`;
}
