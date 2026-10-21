import { addRevokedSession, isSessionRevoked, REVOKED_SESSION_TTL_MS } from "./session-revocation";

describe("session revocation list (AU-16)", () => {
  const now = new Date("2026-10-21T10:00:00Z");

  it("adds a session and drops entries older than the window", () => {
    const stale = { sid: "old", at: new Date(now.getTime() - REVOKED_SESSION_TTL_MS - 1).toISOString() };
    const fresh = { sid: "recent", at: new Date(now.getTime() - 60_000).toISOString() };

    expect(addRevokedSession([stale, fresh], "new", now)).toEqual([fresh, { sid: "new", at: now.toISOString() }]);
  });

  it("matches only listed sids and tolerates bad stored values", () => {
    const stored = addRevokedSession(null, "sid-1", now);

    expect(isSessionRevoked(stored, "sid-1")).toBe(true);
    expect(isSessionRevoked(stored, "sid-2")).toBe(false);
    expect(isSessionRevoked(stored, undefined)).toBe(false);
    expect(isSessionRevoked({ not: "a list" }, "sid-1")).toBe(false);
  });
});
