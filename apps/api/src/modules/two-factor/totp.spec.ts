import { base32Decode, base32Encode, generateTotpSecret, otpauthUrl, totpCode, verifyTotp } from "./totp";

// RFC 6238 appendix B: SHA1 seed "12345678901234567890", 30 s steps, 8 digits.
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890", "ascii"));

describe("TOTP (RFC 6238)", () => {
  it.each([
    [59, "94287082"],
    [1111111109, "07081804"],
    [1111111111, "14050471"],
    [1234567890, "89005924"],
    [2000000000, "69279037"]
  ])("matches the RFC test vector at %i s", (seconds, expected) => {
    expect(totpCode(RFC_SECRET, Math.floor(seconds / 30), 8)).toBe(expected);
  });

  it("round-trips base32 and generates 160-bit secrets", () => {
    const bytes = Buffer.from("helios-office-2fa");
    expect(base32Decode(base32Encode(bytes))).toEqual(bytes);
    expect(base32Decode(generateTotpSecret())).toHaveLength(20);
  });

  it("accepts the code of the current and neighbouring steps only", () => {
    const now = 1_800_000_000_000;
    const step = Math.floor(now / 1000 / 30);

    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step, 6), { digits: 6, periodSeconds: 30, now })).toBe(step);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step - 1, 6), { digits: 6, periodSeconds: 30, now })).toBe(step - 1);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, step + 3, 6), { digits: 6, periodSeconds: 30, now })).toBeNull();
    expect(verifyTotp(RFC_SECRET, "12345", { digits: 6, periodSeconds: 30, now })).toBeNull();
  });

  it("builds an otpauth URL authenticator apps can scan", () => {
    expect(otpauthUrl({ secret: "ABC", account: "linh@helios.vn", issuer: "Helios Office", digits: 6, periodSeconds: 30 })).toBe(
      "otpauth://totp/Helios%20Office%3Alinh%40helios.vn?secret=ABC&issuer=Helios+Office&algorithm=SHA1&digits=6&period=30"
    );
  });
});
