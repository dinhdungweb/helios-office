"use client";

import { useEffect, useState } from "react";
import { AdminSettingsBoard } from "@/components/admin/admin-settings-board";
import { AdminSettingsCenter } from "@/components/admin/admin-settings-center";
import type { AdminSettingsData } from "@/lib/admin-settings-api";

const legacySettingsHashes = new Set(["#system-settings", "#module-settings", "#reconciliation", "#audit-logs"]);

type AdminSettingsRouteProps = {
  data: AdminSettingsData;
};

export function AdminSettingsRoute({ data }: AdminSettingsRouteProps) {
  const [hash, setHash] = useState("");

  useEffect(() => {
    const syncHash = () => setHash(window.location.hash);

    syncHash();
    window.addEventListener("hashchange", syncHash);

    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, []);

  if (legacySettingsHashes.has(hash)) {
    return <AdminSettingsBoard data={data} />;
  }

  return <AdminSettingsCenter />;
}
