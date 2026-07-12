import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export type EncryptedSettingSecret = {
  algorithm: "aes-256-gcm";
  iv: string;
  keyId: string;
  tag: string;
  value: string;
  version: 1;
};

const aad = Buffer.from("helios-office:settings-secret:v1", "utf8");
const devFallbackSecret = "helios-office-development-settings-secret";

@Injectable()
export class SettingsSecretService {
  constructor(private readonly config: ConfigService) {}

  encrypt(value: string): EncryptedSettingSecret {
    const key = this.resolveKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    cipher.setAAD(aad);

    const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);

    return {
      algorithm: "aes-256-gcm",
      iv: iv.toString("base64"),
      keyId: this.keyId(key),
      tag: cipher.getAuthTag().toString("base64"),
      value: encrypted.toString("base64"),
      version: 1
    };
  }

  decrypt(secret: EncryptedSettingSecret): string {
    const key = this.resolveKey();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(secret.iv, "base64"));
    decipher.setAAD(aad);
    decipher.setAuthTag(Buffer.from(secret.tag, "base64"));

    try {
      return Buffer.concat([
        decipher.update(Buffer.from(secret.value, "base64")),
        decipher.final()
      ]).toString("utf8");
    } catch {
      throw new ServiceUnavailableException("Could not decrypt settings secret. Check SETTINGS_SECRET_KEY.");
    }
  }

  isEncryptedSecret(value: unknown): value is EncryptedSettingSecret {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    const candidate = value as Partial<EncryptedSettingSecret>;

    return (
      candidate.algorithm === "aes-256-gcm" &&
      candidate.version === 1 &&
      typeof candidate.iv === "string" &&
      typeof candidate.tag === "string" &&
      typeof candidate.value === "string"
    );
  }

  private resolveKey() {
    const configuredSecret = this.config.get<string>("SETTINGS_SECRET_KEY")?.trim();
    const nodeEnv = this.config.get<string>("NODE_ENV") ?? "development";
    const rawSecret = configuredSecret || (nodeEnv === "production" ? "" : devFallbackSecret);

    if (!rawSecret) {
      throw new ServiceUnavailableException("SETTINGS_SECRET_KEY is required in production.");
    }

    if (nodeEnv === "production" && rawSecret.length < 32) {
      throw new ServiceUnavailableException("SETTINGS_SECRET_KEY must be at least 32 characters in production.");
    }

    if (rawSecret.startsWith("base64:")) {
      return this.normalizeDecodedKey(Buffer.from(rawSecret.slice("base64:".length), "base64"));
    }

    if (rawSecret.startsWith("hex:")) {
      return this.normalizeDecodedKey(Buffer.from(rawSecret.slice("hex:".length), "hex"));
    }

    const base64Candidate = Buffer.from(rawSecret, "base64");

    if (base64Candidate.length === 32) {
      return base64Candidate;
    }

    const hexCandidate = Buffer.from(rawSecret, "hex");

    if (hexCandidate.length === 32) {
      return hexCandidate;
    }

    return createHash("sha256").update(rawSecret).digest();
  }

  private normalizeDecodedKey(value: Buffer) {
    if (value.length === 32) {
      return value;
    }

    throw new ServiceUnavailableException("SETTINGS_SECRET_KEY must decode to 32 bytes.");
  }

  private keyId(key: Buffer) {
    return createHash("sha256").update(key).digest("hex").slice(0, 12);
  }
}
