"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ModalDialog, StateBlock } from "@/components/ui/primitives";
import { deleteStandardRuleAction, saveStandardRuleAction } from "@/lib/shift-actions";
import { daysWithoutSundays, type StandardMode, type StandardRuleRecord, type StandardWorkdayData } from "@/lib/shift-format";
import { Plus } from "@/lib/icons";

type Option = { id: string; name: string };

const MODE_LABELS: Record<StandardMode, string> = {
  schedule: "Theo lịch ca",
  auto: "Số ngày trong tháng trừ Chủ nhật",
  fixed: "Số cố định"
};

const monthLabel = (month: string) => `${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;

function nextMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function currentMonth() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find((part) => part.type === "year")?.value}-${parts.find((part) => part.type === "month")?.value}`;
}

const signed = (value: number) => (value > 0 ? `+ ${value}` : value < 0 ? `− ${Math.abs(value)}` : "");

// What a rule gives for a month, written out: "30 ngày − 4 CN − 1 = 25 công".
function explain(rule: Pick<StandardRuleRecord, "mode" | "fixedUnits" | "adjustUnits">, month: string) {
  if (rule.mode === "schedule") return "Cộng công của các ca được xếp trong tháng";
  if (rule.mode === "fixed") return `${rule.fixedUnits ?? 0} công mỗi tháng`;
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const base = daysWithoutSundays(month);
  const total = Math.max(0, base + rule.adjustUnits);
  return `Tháng ${monthLabel(month)}: ${days} ngày − ${days - base} CN ${signed(rule.adjustUnits)} = ${total} công`.replace(/\s+/g, " ");
}

function names(ids: string[], options: Option[], all: string) {
  if (ids.length === 0) return <span className="standard-all">{all}</span>;
  const byId = new Map(options.map((option) => [option.id, option.name]));
  return (
    <span className="standard-chips">
      {ids.map((id) => (
        <span key={id} className="standard-chip">
          {byId.get(id) ?? "Đã xoá"}
        </span>
      ))}
    </span>
  );
}

function Picker({ label, allLabel, options, selected, onChange }: { label: string; allLabel: string; options: Option[]; selected: string[]; onChange: (ids: string[]) => void }) {
  const [term, setTerm] = useState("");
  const shown = options.filter((option) => option.name.toLowerCase().includes(term.trim().toLowerCase()));
  const toggle = (id: string) => onChange(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return (
    <fieldset className="recalc-departments standard-picker">
      <legend>
        {label} <small>{selected.length ? `${selected.length} đã chọn` : allLabel}</small>
      </legend>
      {options.length > 8 ? <input aria-label={`Tìm ${label.toLowerCase()}`} className="standard-picker-search" placeholder="Tìm..." value={term} onChange={(event) => setTerm(event.target.value)} /> : null}
      <div>
        {shown.map((option) => (
          <label key={option.id} className={selected.includes(option.id) ? "is-checked" : undefined}>
            <input checked={selected.includes(option.id)} type="checkbox" onChange={() => toggle(option.id)} />
            {option.name}
          </label>
        ))}
        {shown.length === 0 ? <span className="standard-muted">Không có mục phù hợp.</span> : null}
      </div>
      {selected.length ? (
        <button className="standard-clear" type="button" onClick={() => onChange([])}>
          Bỏ chọn — áp dụng {allLabel.toLowerCase()}
        </button>
      ) : null}
    </fieldset>
  );
}

function RuleDialog({ rule, data, onClose }: { rule: StandardRuleRecord | null; data: Extract<StandardWorkdayData, { source: "api" }>; onClose: () => void }) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const earliest = data.lockedThrough ? nextMonth(data.lockedThrough) : null;
  const defaultMonth = earliest && earliest > currentMonth() ? earliest : currentMonth();
  const [form, setForm] = useState({
    name: rule?.name ?? "",
    departmentIds: rule?.departmentIds ?? [],
    positionIds: rule?.positionIds ?? [],
    mode: rule?.mode ?? ("auto" as StandardMode),
    fixedUnits: rule?.fixedUnits ?? 26,
    adjustUnits: rule?.adjustUnits ?? 0,
    effectiveFrom: rule?.effectiveFrom ?? defaultMonth,
    note: rule?.note ?? ""
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const set = <Key extends keyof typeof form>(key: Key, value: (typeof form)[Key]) => setForm((current) => ({ ...current, [key]: value }));
  const lockedRule = Boolean(rule && earliest && rule.effectiveFrom < earliest);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  const save = () =>
    startTransition(async () => {
      setError(null);
      const result = await saveStandardRuleAction(rule?.id ?? "", {
        name: form.name.trim(),
        departmentIds: form.departmentIds,
        positionIds: form.positionIds,
        mode: form.mode,
        fixedUnits: form.mode === "fixed" ? Number(form.fixedUnits) : null,
        adjustUnits: form.mode === "auto" ? Number(form.adjustUnits) : 0,
        effectiveFrom: form.effectiveFrom,
        note: form.note.trim() || null
      });
      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    });

  return (
    <ModalDialog className="shift-dialog standard-dialog" ref={dialogRef} title={rule ? `Sửa công chuẩn — ${rule.name}` : "Thêm nhóm công chuẩn"} onCloseRequest={onClose} onCancel={onClose}>
      <div className="account-dialog-form">
        {lockedRule ? (
          <p className="timesheet-period-warning">
            Quy tắc này đang dùng cho kỳ công đã chốt (tới tháng {monthLabel(data.lockedThrough!)}), không sửa được. Hãy thêm quy tắc mới áp dụng từ tháng {monthLabel(earliest!)}.
          </p>
        ) : null}
        <div className="shift-dialog-grid">
          <label className="account-dialog-field">
            <span>Tên nhóm *</span>
            <input autoFocus maxLength={120} placeholder="VD: Khối văn phòng" value={form.name} onChange={(event) => set("name", event.target.value)} />
          </label>
          <label className="account-dialog-field">
            <span>Áp dụng từ tháng *</span>
            <input min={earliest ?? undefined} type="month" value={form.effectiveFrom} onChange={(event) => event.target.value && set("effectiveFrom", event.target.value)} />
          </label>
        </div>

        <div className="shift-dialog-grid">
          <Picker allLabel="Tất cả phòng ban" label="Phòng ban" options={data.departments} selected={form.departmentIds} onChange={(ids) => set("departmentIds", ids)} />
          <Picker allLabel="Tất cả vị trí" label="Vị trí" options={data.positions} selected={form.positionIds} onChange={(ids) => set("positionIds", ids)} />
        </div>

        <fieldset className="standard-modes">
          <legend>Cách tính công chuẩn</legend>
          {(["auto", "fixed", "schedule"] as StandardMode[]).map((mode) => (
            <label key={mode} className={form.mode === mode ? "is-checked" : undefined}>
              <input checked={form.mode === mode} name="standard-mode" type="radio" onChange={() => set("mode", mode)} />
              <span>
                <strong>{MODE_LABELS[mode]}</strong>
                <small>
                  {mode === "auto"
                    ? "Như 1Office: số ngày của tháng trừ các ngày Chủ nhật, cộng / trừ thêm nếu cần."
                    : mode === "fixed"
                      ? "Mọi tháng cùng một số công, ví dụ 26."
                      : "Cộng công của các ca được xếp, đổi theo lịch của từng người."}
                </small>
              </span>
              {mode === "auto" && form.mode === "auto" ? (
                <span className="standard-mode-input">
                  Điều chỉnh
                  <input aria-label="Điều chỉnh (công)" max={31} min={-31} step={0.5} type="number" value={form.adjustUnits} onChange={(event) => set("adjustUnits", Number(event.target.value) || 0)} />
                </span>
              ) : null}
              {mode === "fixed" && form.mode === "fixed" ? (
                <span className="standard-mode-input">
                  <input aria-label="Số công cố định" max={31} min={0} step={0.5} type="number" value={form.fixedUnits} onChange={(event) => set("fixedUnits", Number(event.target.value) || 0)} />
                  công
                </span>
              ) : null}
            </label>
          ))}
        </fieldset>
        <p className="standard-preview" role="status">
          {explain({ mode: form.mode, fixedUnits: Number(form.fixedUnits), adjustUnits: Number(form.adjustUnits) }, form.effectiveFrom)}
        </p>

        <label className="account-dialog-field">
          <span>Ghi chú</span>
          <textarea maxLength={500} rows={2} value={form.note} onChange={(event) => set("note", event.target.value)} />
        </label>
        {error ? <p className="account-dialog-error" role="alert">{error}</p> : null}
        <div className="account-dialog-actions">
          <button className="secondary-button" type="button" onClick={onClose}>
            HỦY BỎ
          </button>
          <button className="primary-button" disabled={isPending || lockedRule || !form.name.trim()} type="button" onClick={save}>
            {isPending ? "ĐANG LƯU..." : "LƯU"}
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}

// AT-25: Cài đặt → Công chuẩn, like 1Office's per-group "Công chuẩn" on the timesheet.
export function StandardWorkdayBoard({ data }: { data: StandardWorkdayData }) {
  const router = useRouter();
  const [editing, setEditing] = useState<StandardRuleRecord | "new" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [month] = useState(currentMonth);

  if (data.source === "unavailable") {
    return <StateBlock tone="error" title="Chưa tải được công chuẩn">{data.error}</StateBlock>;
  }
  const earliest = data.lockedThrough ? nextMonth(data.lockedThrough) : null;
  const hasCatchAll = data.rules.some((rule) => rule.departmentIds.length === 0 && rule.positionIds.length === 0 && rule.effectiveFrom <= month);

  const remove = (rule: StandardRuleRecord) => {
    if (!window.confirm(`Xoá nhóm công chuẩn "${rule.name}"?`)) return;
    startTransition(async () => {
      setMessage(null);
      const result = await deleteStandardRuleAction(rule.id);
      if (result.ok) router.refresh();
      else setMessage(result.error);
    });
  };

  return (
    <section className="personnel-catalog-panel shift-catalog-panel" aria-labelledby="standard-title">
      <header className="personnel-catalog-header">
        <h2 id="standard-title">Công chuẩn</h2>
        <div className="personnel-catalog-actions">
          <button type="button" onClick={() => setEditing("new")}>
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Thêm nhóm
          </button>
        </div>
      </header>
      <p className="shift-catalog-hint">
        Số công chuẩn của tháng trên bảng chấm công, theo nhóm phòng ban × vị trí. Một người thuộc nhiều nhóm thì nhóm cụ thể hơn được dùng (phòng ban và vị trí → phòng ban → vị trí → tất cả).
        {data.lockedThrough ? ` Kỳ công đã chốt tới tháng ${monthLabel(data.lockedThrough)}: quy tắc mới chỉ áp dụng từ tháng ${monthLabel(earliest!)}.` : ""}
      </p>
      {message ? <p className="personnel-catalog-message is-error" role="alert">{message}</p> : null}

      <div className="personnel-catalog-table-shell" tabIndex={0} aria-label="Bảng công chuẩn có thể cuộn ngang">
        <table className="personnel-catalog-table shift-catalog-table standard-table">
          <thead>
            <tr>
              <th scope="col">Nhóm</th>
              <th scope="col">Phòng ban</th>
              <th scope="col">Vị trí</th>
              <th scope="col">Cách tính</th>
              <th scope="col">Áp dụng từ</th>
              <th scope="col">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {data.rules.map((rule) => {
              const locked = Boolean(earliest && rule.effectiveFrom < earliest);
              return (
                <tr key={rule.id}>
                  <td>
                    <strong>{rule.name}</strong>
                    {rule.note ? <small className="shift-tag is-muted">{rule.note}</small> : null}
                  </td>
                  <td>{names(rule.departmentIds, data.departments, "Tất cả")}</td>
                  <td>{names(rule.positionIds, data.positions, "Tất cả")}</td>
                  <td>
                    {MODE_LABELS[rule.mode]}
                    <small className="standard-explain">{explain(rule, rule.effectiveFrom > month ? rule.effectiveFrom : month)}</small>
                  </td>
                  <td>
                    {monthLabel(rule.effectiveFrom)}
                    {rule.effectiveFrom > month ? <small className="standard-explain">Chưa tới</small> : null}
                  </td>
                  <td className="shift-actions">
                    <button disabled={isPending} type="button" onClick={() => setEditing(rule)}>
                      {locked ? "Xem" : "Sửa"}
                    </button>
                    <button disabled={isPending || locked} title={locked ? "Đang dùng cho kỳ công đã chốt" : undefined} type="button" onClick={() => remove(rule)}>
                      Xoá
                    </button>
                  </td>
                </tr>
              );
            })}
            {!hasCatchAll ? (
              <tr className="standard-default-row">
                <td>
                  <strong>Mặc định</strong>
                  <small className="shift-tag is-muted">Người không thuộc nhóm nào</small>
                </td>
                <td>{names([], [], "Tất cả")}</td>
                <td>{names([], [], "Tất cả")}</td>
                <td>
                  {MODE_LABELS.schedule}
                  <small className="standard-explain">Thêm nhóm không chọn phòng ban, vị trí để đổi mặc định.</small>
                </td>
                <td>—</td>
                <td />
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      {editing ? <RuleDialog data={data} rule={editing === "new" ? null : editing} onClose={() => setEditing(null)} /> : null}
    </section>
  );
}
