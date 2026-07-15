import os from "node:os";
import type { NextConfig } from "next";

function splitEnvList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toHostname(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return value.replace(/^https?:\/\//, "").split(":")[0];
  }
}

function getLocalIPv4Hosts() {
  return Object.values(os.networkInterfaces())
    .flatMap((networkInterface) => networkInterface ?? [])
    .filter((address) => address.family === "IPv4" && !address.internal)
    .map((address) => address.address);
}

const allowedDevOrigins = Array.from(
  new Set(
    [
      "localhost",
      "127.0.0.1",
      ...getLocalIPv4Hosts(),
      ...splitEnvList(process.env.WEB_ORIGIN),
      ...splitEnvList(process.env.WEB_ORIGINS)
    ].map(toHostname)
  )
).filter(Boolean);

const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV === "production" ? {} : { allowedDevOrigins }),
  reactStrictMode: true,
  typedRoutes: true
};

export default nextConfig;
