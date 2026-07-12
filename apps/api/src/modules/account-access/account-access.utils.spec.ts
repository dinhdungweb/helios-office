import {
  buildPermissionGroupIdBase,
  buildPermissionGroupIdCandidate,
  resolveCustomPermissionKeys,
  resolveEffectivePermissionKeys
} from "./account-access.utils";

describe("account access utils", () => {
  it("builds readable permission group ids from Vietnamese names", () => {
    expect(buildPermissionGroupIdBase("Kế toán nội bộ")).toBe("grp-ke-toan-noi-bo");
    expect(buildPermissionGroupIdBase("Đội HR & C&B")).toBe("grp-doi-hr-c-b");
  });

  it("falls back to a generic group id when the name has no slug characters", () => {
    expect(buildPermissionGroupIdBase("!!!")).toBe("grp-group");
  });

  it("builds suffixed candidates for duplicate ids", () => {
    expect(buildPermissionGroupIdCandidate("grp-ke-toan", 1)).toBe("grp-ke-toan");
    expect(buildPermissionGroupIdCandidate("grp-ke-toan", 2)).toBe("grp-ke-toan-2");
  });

  it("normalizes custom permission keys from arrays and legacy json objects", () => {
    expect(resolveCustomPermissionKeys(["reports.company.view", "", "reports.company.view"])).toEqual([
      "reports.company.view"
    ]);
    expect(resolveCustomPermissionKeys({ keys: ["system.accounts.manage"] })).toEqual([
      "system.accounts.manage"
    ]);
  });

  it("resolves effective permissions from lifecycle, group status, and admin role", () => {
    const catalogKeys = ["system.accounts.manage", "reports.company.view", "requests.personal.create"];

    expect(
      resolveEffectivePermissionKeys(
        {
          adminRole: "user",
          accountStatus: "pending_activation",
          groupPermissionKeys: ["requests.personal.create"],
          customPermissionKeys: ["reports.company.view"]
        },
        catalogKeys
      )
    ).toEqual([]);

    expect(
      resolveEffectivePermissionKeys(
        {
          adminRole: "user",
          accountStatus: "active",
          permissionGroupStatus: "archived",
          groupPermissionKeys: ["requests.personal.create"],
          customPermissionKeys: ["reports.company.view"]
        },
        catalogKeys
      )
    ).toEqual(["reports.company.view"]);

    expect(
      resolveEffectivePermissionKeys(
        {
          adminRole: "system_admin",
          accountStatus: "active",
          groupPermissionKeys: []
        },
        catalogKeys
      )
    ).toEqual(catalogKeys);
  });
});
