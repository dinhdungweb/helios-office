import { SettingsSecretService } from "./settings-secret.service";

function createService(secret: string) {
  return new SettingsSecretService({
    get: (key: string) => {
      if (key === "SETTINGS_SECRET_KEY") {
        return secret;
      }

      if (key === "NODE_ENV") {
        return "test";
      }

      return undefined;
    }
  } as never);
}

describe("SettingsSecretService", () => {
  it("encrypts and decrypts a settings secret", () => {
    const service = createService("base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    const secret = service.encrypt("smtp-app-password");

    expect(secret.value).not.toBe("smtp-app-password");
    expect(service.decrypt(secret)).toBe("smtp-app-password");
  });

  it("rejects ciphertext when the settings key changes", () => {
    const service = createService("base64:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    const wrongKeyService = createService("base64:AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=");
    const secret = service.encrypt("smtp-app-password");

    expect(() => wrongKeyService.decrypt(secret)).toThrow("Could not decrypt settings secret");
  });
});
