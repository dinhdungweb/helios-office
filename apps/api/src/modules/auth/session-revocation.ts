// Sessions signed out one at a time (AU-16), stored on UserAccount.revokedSessionIds. Keycloak ends
// the session at once, but access tokens it already issued stay valid until they expire, so the
// API refuses tokens whose `sid` is listed here. An entry is only needed while such a token could
// still be valid; this window comfortably exceeds the realm's access token lifespan.
export const REVOKED_SESSION_TTL_MS = 60 * 60_000;
const MAX_REVOKED_SESSIONS = 50;

export type RevokedSession = { sid: string; at: string };

export function parseRevokedSessions(value: unknown): RevokedSession[] {
  if (!Array.isArray(value)) return [];

  return value.filter(
    (item): item is RevokedSession =>
      Boolean(item) && typeof item === "object" && typeof (item as RevokedSession).sid === "string" && typeof (item as RevokedSession).at === "string"
  );
}

export function isSessionRevoked(value: unknown, sid: unknown) {
  return typeof sid === "string" && parseRevokedSessions(value).some((item) => item.sid === sid);
}

// The stored list after revoking `sid`: expired entries dropped, newest kept.
export function addRevokedSession(value: unknown, sid: string, now = new Date()): RevokedSession[] {
  const cutoff = now.getTime() - REVOKED_SESSION_TTL_MS;
  const kept = parseRevokedSessions(value).filter((item) => item.sid !== sid && Date.parse(item.at) >= cutoff);

  return [...kept, { sid, at: now.toISOString() }].slice(-MAX_REVOKED_SESSIONS);
}
