"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AttendanceLocationMap, type MapPoint } from "@/components/admin/attendance-location-map";
import { ModalDialog, StateBlock } from "@/components/ui/primitives";
import { deleteLocationAction, saveLocationAction, type LocationPayload } from "@/lib/attendance-location-actions";
import type { AttendanceLocationData, AttendanceLocationRecord, AttendanceLocationType } from "@/lib/attendance-location-api";
import { Plus } from "@/lib/icons";

const TYPES: Array<{ value: AttendanceLocationType; label: string; hint: string }> = [
  { value: "gps", label: "Định vị GPS", hint: "Đứng trong bán kính quanh một điểm. Web và app đều dùng được." },
  { value: "ip", label: "Mạng văn phòng (IP)", hint: "Truy cập từ mạng có IP công cộng của văn phòng. Cách kiểm tra mạng trên trình duyệt." },
  { value: "wifi", label: "Wifi", hint: "Kết nối đúng wifi (SSID / BSSID). Chỉ app di động đọc được, trình duyệt không đọc được." }
];
const TYPE_LABELS: Record<AttendanceLocationType, string> = { gps: "GPS", ip: "IP", wifi: "Wifi" };

function detail(location: AttendanceLocationRecord) {
  if (location.type === "gps") return `${location.latitude?.toFixed(6)}, ${location.longitude?.toFixed(6)} · bán kính ${location.radiusMeters} m`;
  if (location.type === "wifi") return [location.ssid ? `SSID ${location.ssid}` : null, location.bssid ? `BSSID ${location.bssid}` : null].filter(Boolean).join(" · ");
  return location.ipRanges.join(", ");
}

type Form = {
  name: string;
  type: AttendanceLocationType;
  workplaceId: string;
  latitude: string;
  longitude: string;
  radiusMeters: number;
  ssid: string;
  bssid: string;
  ipRanges: string;
  active: boolean;
  note: string;
};

function LocationDialog({ location, data, onClose }: { location: AttendanceLocationRecord | null; data: Extract<AttendanceLocationData, { source: "api" }>; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [form, setForm] = useState<Form>({
    name: location?.name ?? "",
    type: location?.type ?? "gps",
    workplaceId: location?.workplaceId ?? "",
    latitude: location?.latitude?.toString() ?? "",
    longitude: location?.longitude?.toString() ?? "",
    radiusMeters: location?.radiusMeters ?? 100,
    ssid: location?.ssid ?? "",
    bssid: location?.bssid ?? "",
    ipRanges: location?.ipRanges.join("\n") ?? "",
    active: (location?.status ?? "active") === "active",
    note: location?.note ?? ""
  });
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [isPending, startTransition] = useTransition();
  const set = <Key extends keyof Form>(key: Key, value: Form[Key]) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const hasPoint = form.latitude !== "" && form.longitude !== "" && Number.isFinite(latitude) && Number.isFinite(longitude);
  const others = useMemo<MapPoint[]>(
    () =>
      data.locations
        .filter((item) => item.type === "gps" && item.id !== location?.id && item.latitude !== null && item.longitude !== null)
        .map((item) => ({ id: item.id, latitude: item.latitude!, longitude: item.longitude!, radiusMeters: item.radiusMeters, label: item.name, active: item.status === "active" })),
    [data.locations, location?.id]
  );
  const value = useMemo(() => (hasPoint ? { latitude, longitude, radiusMeters: form.radiusMeters } : null), [hasPoint, latitude, longitude, form.radiusMeters]);

  const locate = () => {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setForm((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }));
      },
      () => {
        setLocating(false);
        setError("Không lấy được vị trí. Hãy cho phép trình duyệt truy cập vị trí hoặc bấm lên bản đồ.");
      },
      { enableHighAccuracy: true, timeout: 15_000 }
    );
  };

  const addMyIp = () => {
    if (!data.myIp) return;
    const lines = form.ipRanges.split(/\n/).map((line) => line.trim()).filter(Boolean);
    if (!lines.includes(data.myIp)) set("ipRanges", [...lines, data.myIp].join("\n"));
  };

  const save = () =>
    startTransition(async () => {
      setError(null);
      const payload: LocationPayload = {
        name: form.name.trim(),
        type: form.type,
        workplaceId: form.workplaceId || null,
        latitude: hasPoint ? latitude : null,
        longitude: hasPoint ? longitude : null,
        radiusMeters: form.radiusMeters,
        ssid: form.ssid.trim() || null,
        bssid: form.bssid.trim() || null,
        ipRanges: form.ipRanges.split(/[\n,]/).map((line) => line.trim()).filter(Boolean),
        status: form.active ? "active" : "inactive",
        note: form.note.trim() || null
      };
      const result = await saveLocationAction(location?.id ?? "", payload);
      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    });

  return (
    <ModalDialog className="shift-dialog location-dialog" ref={dialogRef} title={location ? `Sửa điểm chấm công — ${location.name}` : "Thêm điểm chấm công"} onCloseRequest={onClose} onCancel={onClose}>
      <div className="account-dialog-form">
        <div className="shift-dialog-grid">
          <label className="account-dialog-field">
            <span>Tên điểm *</span>
            <input autoFocus maxLength={120} placeholder="VD: Văn phòng Hà Nội" value={form.name} onChange={(event) => set("name", event.target.value)} />
          </label>
          <label className="account-dialog-field">
            <span>Nơi làm việc</span>
            <select value={form.workplaceId} onChange={(event) => set("workplaceId", event.target.value)}>
              <option value="">— Không gắn —</option>
              {data.workplaces.map((workplace) => (
                <option key={workplace.id} value={workplace.id}>
                  {workplace.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="location-types">
          <legend>Kiểu điểm chấm công</legend>
          {TYPES.map((type) => (
            <label key={type.value} className={form.type === type.value ? "is-checked" : undefined}>
              <input checked={form.type === type.value} name="location-type" type="radio" onChange={() => set("type", type.value)} />
              <strong>{type.label}</strong>
              <small>{type.hint}</small>
            </label>
          ))}
        </fieldset>

        {form.type === "gps" ? (
          <div className="location-gps">
            <AttendanceLocationMap height={300} label="Bản đồ chọn điểm chấm công" points={others} value={value} onPick={(lat, lng) => setForm((current) => ({ ...current, latitude: String(lat), longitude: String(lng) }))} />
            <p className="location-map-hint">Bấm lên bản đồ để đặt điểm. Vòng xanh là phạm vi được chấm công; vòng xám là các điểm khác.</p>
            <div className="location-gps-fields">
              <label className="account-dialog-field">
                <span>Vĩ độ</span>
                <input inputMode="decimal" placeholder="21.028500" value={form.latitude} onChange={(event) => set("latitude", event.target.value)} />
              </label>
              <label className="account-dialog-field">
                <span>Kinh độ</span>
                <input inputMode="decimal" placeholder="105.854200" value={form.longitude} onChange={(event) => set("longitude", event.target.value)} />
              </label>
              <button className="secondary-button" disabled={locating} type="button" onClick={locate}>
                {locating ? "Đang lấy vị trí..." : "Lấy vị trí hiện tại"}
              </button>
            </div>
            <label className="account-dialog-field location-radius">
              <span>
                Bán kính <strong>{form.radiusMeters} m</strong>
              </span>
              <input aria-label="Bán kính (m)" max={1000} min={30} step={10} type="range" value={Math.min(form.radiusMeters, 1000)} onChange={(event) => set("radiusMeters", Number(event.target.value))} />
              <small>GPS trong nhà thường lệch 20–50 m; 100 m là mức an toàn cho một toà văn phòng.</small>
            </label>
          </div>
        ) : null}

        {form.type === "wifi" ? (
          <div className="shift-dialog-grid">
            <label className="account-dialog-field">
              <span>Tên wifi (SSID)</span>
              <input maxLength={64} placeholder="VD: Helios-Office" value={form.ssid} onChange={(event) => set("ssid", event.target.value)} />
            </label>
            <label className="account-dialog-field">
              <span>Địa chỉ bộ phát (BSSID)</span>
              <input maxLength={32} placeholder="aa:bb:cc:dd:ee:ff" value={form.bssid} onChange={(event) => set("bssid", event.target.value)} />
              <small>Có BSSID thì chỉ khớp đúng bộ phát đó (khó giả mạo hơn tên wifi).</small>
            </label>
          </div>
        ) : null}

        {form.type === "ip" ? (
          <label className="account-dialog-field">
            <span>Địa chỉ IP hoặc dải IP (mỗi dòng một mục)</span>
            <textarea placeholder={"113.160.12.5\n113.160.12.0/24"} rows={4} value={form.ipRanges} onChange={(event) => set("ipRanges", event.target.value)} />
            <small>
              Là IP công cộng của mạng văn phòng (nhà mạng cấp), không phải IP nội bộ 192.168.x.x.
              {data.myIp ? (
                <>
                  {" "}
                  IP của bạn lúc này: <strong>{data.myIp}</strong>{" "}
                  <button className="location-inline-button" type="button" onClick={addMyIp}>
                    Thêm IP này
                  </button>
                </>
              ) : null}
            </small>
          </label>
        ) : null}

        <div className="shift-dialog-grid">
          <label className="account-dialog-field">
            <span>Ghi chú</span>
            <input maxLength={500} value={form.note} onChange={(event) => set("note", event.target.value)} />
          </label>
          <label className="location-active">
            <input checked={form.active} type="checkbox" onChange={(event) => set("active", event.target.checked)} />
            Đang dùng để chấm công
          </label>
        </div>

        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            HỦY BỎ
          </button>
          <button className="primary-button" disabled={isPending || !form.name.trim()} type="button" onClick={save}>
            {isPending ? "ĐANG LƯU..." : "LƯU"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

// DV-07: Công → Cài đặt → Chấm công GPS/Wifi, like 1Office's setting of the same name.
export function AttendanceLocationBoard({ data }: { data: AttendanceLocationData }) {
  const router = useRouter();
  const [editing, setEditing] = useState<AttendanceLocationRecord | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const points = useMemo<MapPoint[]>(
    () =>
      data.source === "api"
        ? data.locations
            .filter((item) => item.type === "gps" && item.latitude !== null && item.longitude !== null)
            .map((item) => ({ id: item.id, latitude: item.latitude!, longitude: item.longitude!, radiusMeters: item.radiusMeters, label: item.name, active: item.status === "active" }))
        : [],
    [data]
  );

  if (data.source === "unavailable") {
    return <StateBlock tone="error" title="Chưa tải được điểm chấm công">{data.error}</StateBlock>;
  }

  const run = (action: () => Promise<{ ok: true } | { ok: false; error: string }>) =>
    startTransition(async () => {
      setMessage(null);
      const result = await action();
      if (result.ok) router.refresh();
      else setMessage(result.error);
    });
  const toggle = (location: AttendanceLocationRecord) =>
    run(() =>
      saveLocationAction(location.id, {
        name: location.name,
        type: location.type,
        workplaceId: location.workplaceId,
        latitude: location.latitude,
        longitude: location.longitude,
        radiusMeters: location.radiusMeters,
        ssid: location.ssid,
        bssid: location.bssid,
        ipRanges: location.ipRanges,
        status: location.status === "active" ? "inactive" : "active",
        note: location.note
      })
    );

  return (
    <section className="personnel-catalog-panel shift-catalog-panel" aria-labelledby="location-title">
      <header className="personnel-catalog-header">
        <h2 id="location-title">Chấm công GPS/Wifi</h2>
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setEditing("new")}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Thêm điểm
          </button>
        </div>
      </header>
      <p className="shift-catalog-hint">
        Nhân viên chấm công trên web hoặc app phải ở trong một điểm đang dùng. Trình duyệt kiểm tra được vị trí GPS và mạng văn phòng (IP); wifi chỉ app di động kiểm tra được. Bật / tắt cách kiểm tra ở Cài đặt đối tượng → Chấm công.
      </p>
      {message ? <p className="personnel-catalog-message is-error" role="alert">{message}</p> : null}

      {points.length > 0 ? (
        <div className="location-overview">
          <AttendanceLocationMap height={260} label="Bản đồ các điểm chấm công GPS" points={points} />
        </div>
      ) : null}

      <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng điểm chấm công có thể cuộn ngang">
        <table className="personnel-catalog-table shift-catalog-table location-table">
          <thead>
            <tr>
              <th scope="col">Tên điểm</th>
              <th scope="col">Kiểu</th>
              <th scope="col">Chi tiết</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.locations.map((location) => (
              <tr key={location.id} className={location.status === "inactive" ? "is-inactive" : undefined}>
                <td>
                  <strong>{location.name}</strong>
                  {location.workplace ? <small className="shift-tag is-muted">{location.workplace.name}</small> : null}
                  {location.note ? <small className="location-note">{location.note}</small> : null}
                </td>
                <td>
                  <span className={`location-type is-${location.type}`}>{TYPE_LABELS[location.type]}</span>
                </td>
                <td className="location-detail">{detail(location)}</td>
                <td>
                  <button aria-checked={location.status === "active"} className="device-switch" disabled={isPending} role="switch" type="button" onClick={() => toggle(location)}>
                    <span aria-hidden="true" />
                    {location.status === "active" ? "Đang dùng" : "Đã tắt"}
                  </button>
                </td>
                <td className="shift-actions">
                  <button disabled={isPending} type="button" onClick={() => setEditing(location)}>
                    Sửa
                  </button>
                  <button
                    disabled={isPending}
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Xoá điểm chấm công "${location.name}"? Lượt chấm đã ghi vẫn giữ nguyên.`)) run(() => deleteLocationAction(location.id));
                    }}
                  >
                    Xoá
                  </button>
                </td>
              </tr>
            ))}
            {data.locations.length === 0 ? (
              <tr>
                <td className="location-empty" colSpan={5}>
                  Chưa có điểm chấm công nào. Thêm văn phòng, cửa hàng bằng GPS hoặc mạng văn phòng (IP) để nhân viên chấm công trên web.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? <LocationDialog data={data} location={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}
