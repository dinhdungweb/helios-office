import {
  formatDate,
  formatHours,
  formatTime,
  type AbsencePayload,
  type CheckinOutPayload,
  type LeavePayload,
  type OvertimePayload,
  type RequestDetail,
  type ResignationPayload,
  type ShiftChangePayload
} from "@/lib/request-format";

// What each request type shows on its detail page (LV-04 for leave, Phase 3b task 9 for the others).

const hours = (minutes: number) => formatHours(Math.round((minutes / 60) * 100) / 100);

// The type's own fact next to "Loại đơn" (e.g. paid or not).
export function typeFact(request: RequestDetail): { label: string; value: string } {
  const payload = request.payload as Record<string, unknown>;
  switch (request.type) {
    case "absence":
      return { label: "Loại vắng mặt", value: String(payload.kindLabel ?? "") };
    case "overtime":
      return { label: "Loại làm thêm", value: String(payload.kindLabel ?? "") };
    case "shift_change":
      return { label: "Ca hiện tại", value: (payload as Partial<ShiftChangePayload>).fromShift?.code ?? "Ngày nghỉ" };
    case "resignation":
      return { label: "Báo trước", value: `${(payload as Partial<ResignationPayload>).noticeDays ?? 0} ngày` };
    case "checkin_out":
      return { label: "Ca làm việc", value: (payload as Partial<CheckinOutPayload>).shiftCode ?? "Không có ca" };
    default:
      return { label: "Tính công", value: payload.paid === undefined ? "" : payload.paid ? "Có lương" : "Không lương" };
  }
}

type Table = { label: string; headers: string[]; rows: Array<{ key: string; cells: string[] }> };

function table(request: RequestDetail): Table | null {
  const payload = request.payload;
  switch (request.type) {
    case "absence": {
      const ranges = (payload as Partial<AbsencePayload>).ranges ?? [];
      return { label: "Các khoảng vắng mặt", headers: ["Ngày", "Thời gian", "Số giờ"], rows: ranges.map((range, index) => ({ key: `${index}`, cells: [formatDate(range.date), `${range.fromTime} – ${range.toTime}`, hours(range.minutes)] })) };
    }
    case "overtime": {
      const item = payload as Partial<OvertimePayload>;
      return {
        label: "Giờ làm thêm",
        headers: ["Ngày", "Thời gian", "Số giờ"],
        rows: [{ key: "ot", cells: [formatDate(item.date), `${item.fromTime} – ${item.toTime}${item.overnight ? " (hôm sau)" : ""}`, hours(item.minutes ?? 0)] }]
      };
    }
    case "checkin_out": {
      const item = payload as Partial<CheckinOutPayload>;
      return {
        label: "Giờ chấm công",
        headers: ["", "Đã ghi nhận", "Giải trình"],
        rows: [
          { key: "in", cells: ["Giờ vào", formatTime(item.recorded?.checkIn) || "—", item.checkIn ?? "—"] },
          { key: "out", cells: ["Giờ ra", formatTime(item.recorded?.checkOut) || "—", item.checkOut ? `${item.checkOut}${item.checkOutNextDay ? " (hôm sau)" : ""}` : "—"] }
        ]
      };
    }
    case "shift_change": {
      const item = payload as Partial<ShiftChangePayload>;
      return {
        label: "Đổi ca",
        headers: ["Ngày", "Ca hiện tại", "Đổi sang"],
        rows: [{ key: "change", cells: [formatDate(item.date), item.fromShift ? `${item.fromShift.code} · ${item.fromShift.name}` : "Ngày nghỉ", item.toShift ? `${item.toShift.code} · ${item.toShift.name}` : ""] }]
      };
    }
    case "resignation": {
      const item = payload as Partial<ResignationPayload>;
      return { label: "Thôi việc", headers: ["Ngày làm việc cuối", "Bàn giao"], rows: [{ key: "resign", cells: [formatDate(item.lastWorkingDate), item.handover || "—"] }] };
    }
    default: {
      const days = (payload as Partial<LeavePayload>).days ?? [];
      return {
        label: "Các ngày nghỉ",
        headers: ["Ngày", "Thời gian nghỉ", "Công"],
        rows: days.map((day) => ({ key: day.date, cells: [formatDate(day.date), `${Math.floor(day.minutes / 60)} giờ${day.minutes % 60 ? ` ${day.minutes % 60} phút` : ""}`, String(day.units)] }))
      };
    }
  }
}

export function RequestTypeDetailTable({ request }: { request: RequestDetail }) {
  const data = table(request);
  if (!data) return null;
  return (
    <div className="request-detail-table" role="table" aria-label={data.label}>
      <div role="rowgroup">
        <div role="row">
          {data.headers.map((header, index) => (
            <span role="columnheader" key={index}>
              {header}
            </span>
          ))}
        </div>
        {data.rows.map((row) => (
          <div role="row" key={row.key}>
            {row.cells.map((cell, index) => (
              <strong role="cell" key={index}>
                {cell}
              </strong>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
