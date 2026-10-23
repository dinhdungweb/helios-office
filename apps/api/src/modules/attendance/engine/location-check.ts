import { isIP } from "node:net";

// Where a web/app check-in comes from, checked against the valid places (DV-07, AT-13):
// a GPS point within a radius, a wifi network (SSID or BSSID, sent by the mobile app only; a
// browser cannot read it) or an office IP range (what a browser can be checked by).

export type LocationRule = {
  id: string;
  name: string;
  type: "gps" | "wifi" | "ip";
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  ssid: string | null;
  bssid: string | null;
  ipRanges: string[];
};

export type CheckInEvidence = {
  latitude?: number | null;
  longitude?: number | null;
  // GPS accuracy in metres, as the device reports it.
  accuracy?: number | null;
  ssid?: string | null;
  bssid?: string | null;
  ip?: string | null;
};

const EARTH_RADIUS_M = 6_371_000;

export function distanceMeters(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) {
  const rad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLng = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// "::ffff:10.0.0.5" (IPv4 seen through an IPv6 socket) counts as 10.0.0.5.
export function normalizeIp(ip: string) {
  const trimmed = ip.trim();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(trimmed);
  return mapped ? mapped[1] : trimmed.toLowerCase();
}

function ipv4ToNumber(ip: string) {
  return ip.split(".").reduce((value, part) => value * 256 + Number(part), 0);
}

function ipv6ToBigInt(ip: string) {
  const [head, tail = ""] = ip.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = ip.includes("::") ? 8 - headParts.length - tailParts.length : 0;
  const parts = [...headParts, ...Array<string>(missing).fill("0"), ...tailParts];
  return parts.reduce((value, part) => (value << 16n) + BigInt(parseInt(part || "0", 16)), 0n);
}

// A single address or a CIDR range, IPv4 or IPv6. Returns null when it is not valid.
export function parseIpRange(range: string) {
  const [address, bitsText] = range.trim().split("/");
  const ip = normalizeIp(address ?? "");
  const family = isIP(ip);
  if (family === 0) return null;
  const maxBits = family === 4 ? 32 : 128;
  const bits = bitsText === undefined ? maxBits : Number(bitsText);
  if (!Number.isInteger(bits) || bits < 0 || bits > maxBits) return null;
  return { family, ip, bits };
}

export function ipInRange(ipText: string, range: string) {
  const parsed = parseIpRange(range);
  const ip = normalizeIp(ipText);
  const family = isIP(ip);
  if (!parsed || family !== parsed.family) return false;
  if (family === 4) {
    if (parsed.bits === 0) return true;
    const shift = 32 - parsed.bits;
    return Math.floor(ipv4ToNumber(ip) / 2 ** shift) === Math.floor(ipv4ToNumber(parsed.ip) / 2 ** shift);
  }
  const shift = BigInt(128 - parsed.bits);
  return ipv6ToBigInt(ip) >> shift === ipv6ToBigInt(parsed.ip) >> shift;
}

const sameText = (a: string | null | undefined, b: string | null | undefined) => Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

// The places the evidence satisfies, by kind, with how far the nearest GPS point was (for the
// refusal message when none is close enough).
export function matchLocations(locations: LocationRule[], evidence: CheckInEvidence) {
  let gps: { location: LocationRule; distance: number } | null = null;
  let nearest: { location: LocationRule; distance: number } | null = null;
  let wifi: LocationRule | null = null;
  let network: LocationRule | null = null;
  const hasPosition = typeof evidence.latitude === "number" && typeof evidence.longitude === "number";

  for (const location of locations) {
    if (location.type === "gps" && hasPosition && location.latitude !== null && location.longitude !== null) {
      const distance = distanceMeters({ latitude: evidence.latitude!, longitude: evidence.longitude! }, { latitude: location.latitude, longitude: location.longitude });
      if (!nearest || distance < nearest.distance) nearest = { location, distance };
      // A poor fix may still be inside: allow the reported accuracy, capped so a 5 km fix does not pass.
      const slack = Math.min(Math.max(evidence.accuracy ?? 0, 0), 100);
      if (distance <= location.radiusMeters + slack && (!gps || distance < gps.distance)) gps = { location, distance };
    }
    if (location.type === "wifi" && !wifi && (sameText(location.bssid, evidence.bssid) || (!location.bssid && sameText(location.ssid, evidence.ssid)))) wifi = location;
    if (location.type === "ip" && !network && evidence.ip && location.ipRanges.some((range) => ipInRange(evidence.ip!, range))) network = location;
  }
  return { gps, nearest, wifi, network };
}
