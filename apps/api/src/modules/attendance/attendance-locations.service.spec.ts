import { BadRequestException } from "@nestjs/common";
import { AttendanceLocationsService } from "./attendance-locations.service";
import { distanceMeters, ipInRange, matchLocations, parseIpRange, type LocationRule } from "./engine/location-check";

const place = (overrides: Partial<LocationRule>): LocationRule => ({
  id: "p",
  name: "Văn phòng",
  type: "gps",
  latitude: 21.0285,
  longitude: 105.8542,
  radiusMeters: 100,
  ssid: null,
  bssid: null,
  ipRanges: [],
  ...overrides
});

describe("check-in place matching (DV-07)", () => {
  it("measures distance on the Earth's surface", () => {
    // 0.0043° north-south and 0.0033° east-west around Hà Nội: about 590 m.
    const diagonal = distanceMeters({ latitude: 21.0285, longitude: 105.8542 }, { latitude: 21.0242, longitude: 105.8575 });
    expect(diagonal).toBeGreaterThan(580);
    expect(diagonal).toBeLessThan(600);
    expect(distanceMeters({ latitude: 21.0285, longitude: 105.8542 }, { latitude: 21.0285, longitude: 105.8542 })).toBe(0);
    // 0.001° of latitude ≈ 111 m.
    expect(Math.round(distanceMeters({ latitude: 21, longitude: 105 }, { latitude: 21.001, longitude: 105 }))).toBe(111);
  });

  it("checks IPv4 and IPv6 addresses and ranges", () => {
    expect(ipInRange("113.160.12.77", "113.160.12.0/24")).toBe(true);
    expect(ipInRange("113.160.13.1", "113.160.12.0/24")).toBe(false);
    expect(ipInRange("::ffff:10.0.0.5", "10.0.0.0/8")).toBe(true);
    expect(ipInRange("10.0.0.5", "10.0.0.5")).toBe(true);
    expect(ipInRange("2001:db8::1", "2001:db8::/32")).toBe(true);
    expect(ipInRange("2001:db9::1", "2001:db8::/32")).toBe(false);
    expect(ipInRange("10.0.0.5", "2001:db8::/32")).toBe(false);
    expect(parseIpRange("300.1.1.1")).toBeNull();
    expect(parseIpRange("10.0.0.0/33")).toBeNull();
  });

  it("finds the GPS point within its radius (allowing the reported accuracy), the wifi and the network", () => {
    const office = place({ id: "office" });
    const far = place({ id: "far", latitude: 21.05, longitude: 105.8 });
    const wifi = place({ id: "wifi", type: "wifi", ssid: "Helios", bssid: "a4:2b:b0:12:34:56" });
    const ssidOnly = place({ id: "ssid", type: "wifi", ssid: "Helios-Guest" });
    const ip = place({ id: "ip", type: "ip", ipRanges: ["113.160.12.0/24"] });
    const all = [far, office, wifi, ssidOnly, ip];

    // ~111 m north: outside 100 m, inside with 20 m accuracy.
    const north = { latitude: 21.0295, longitude: 105.8542 };
    expect(matchLocations(all, { ...north, accuracy: 0 }).gps).toBeNull();
    expect(matchLocations(all, { ...north, accuracy: 0 }).nearest?.location.id).toBe("office");
    expect(matchLocations(all, { ...north, accuracy: 20 }).gps?.location.id).toBe("office");
    // A wildly inaccurate fix is capped at 100 m of slack.
    expect(matchLocations(all, { latitude: 21.032, longitude: 105.8542, accuracy: 5000 }).gps).toBeNull();

    expect(matchLocations(all, { bssid: "A4:2B:B0:12:34:56" }).wifi?.id).toBe("wifi");
    expect(matchLocations(all, { ssid: "Helios", bssid: "00:00:00:00:00:00" }).wifi).toBeNull();
    expect(matchLocations(all, { ssid: "helios-guest" }).wifi?.id).toBe("ssid");
    expect(matchLocations(all, { ip: "113.160.12.9" }).network?.id).toBe("ip");
    expect(matchLocations(all, { ip: "8.8.8.8" }).network).toBeNull();
  });
});

describe("AttendanceLocationsService (DV-07)", () => {
  function setup() {
    const prisma = {
      attendanceLocation: { create: jest.fn(async ({ data }) => ({ id: "l1", ...data })), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
      workplace: { findUnique: jest.fn().mockResolvedValue({ id: "wp" }) },
      auditLog: { create: jest.fn() }
    };
    return { service: new AttendanceLocationsService(prisma as never, { contextFields: () => ({}) } as never), prisma };
  }

  it("keeps only the fields of the chosen kind", async () => {
    const { service, prisma } = setup();
    await service.create({ name: " Cửa hàng ", type: "gps", latitude: 21, longitude: 105, radiusMeters: 150, ssid: "x", ipRanges: ["1.1.1.1"] }, "emp-hr");
    expect(prisma.attendanceLocation.create.mock.calls[0][0].data).toEqual({
      name: "Cửa hàng",
      type: "gps",
      workplaceId: null,
      status: "active",
      note: null,
      latitude: 21,
      longitude: 105,
      radiusMeters: 150,
      ssid: null,
      bssid: null,
      ipRanges: []
    });
    expect(prisma.auditLog.create.mock.calls[0][0].data).toMatchObject({ action: "attendance_location.create", actorId: "emp-hr" });

    await service.create({ name: "Wifi", type: "wifi", bssid: "A4-2B-B0-12-34-56" });
    expect(prisma.attendanceLocation.create.mock.calls[1][0].data).toMatchObject({ ssid: null, bssid: "a4:2b:b0:12:34:56", latitude: null });

    await service.create({ name: "Mạng", type: "ip", ipRanges: [" 113.160.12.0/24 ", "113.160.12.0/24", ""] });
    expect(prisma.attendanceLocation.create.mock.calls[2][0].data.ipRanges).toEqual(["113.160.12.0/24"]);
  });

  it("explains what is missing or invalid", async () => {
    const { service } = setup();
    await expect(service.create({ name: "GPS", type: "gps" })).rejects.toThrow("Chọn vị trí trên bản đồ");
    await expect(service.create({ name: "Wifi", type: "wifi" })).rejects.toThrow("SSID");
    await expect(service.create({ name: "Wifi", type: "wifi", bssid: "abc" })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.create({ name: "IP", type: "ip", ipRanges: ["10.0.0.0/8", "999.1.1.1"] })).rejects.toThrow("999.1.1.1");
  });
});
