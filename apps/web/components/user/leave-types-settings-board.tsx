"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { deleteLeaveTypeAction, saveLeaveTypeAction, type LeaveTypeInput } from "@/lib/request-actions";
import { MIN_UNIT_LABEL, type LeaveType } from "@/lib/request-format";

type Draft = {
  code: string;
  name: string;
  paid: boolean;
  deductsBalance: boolean;
  minUnit: LeaveType["minUnit"];
  maxDaysPerRequest: string;
  requiresDocument: boolean;
  gender: LeaveType["gender"];
  allowDuringProbation: boolean;
  sortOrder: string;
};

const EMPTY: Draft = { code: "", name: "", paid: true, deductsBalance: false, minUnit: "half_day", maxDaysPerRequest: "", requiresDocument: false, gender: "all", allowDuringProbation: true, sortOrder: "0" };

function toDraft(type: LeaveType): Draft {
  return {
    code: type.code,
    name: type.name,
    paid: type.paid,
    deductsBalance: type.deductsBalance,
    minUnit: type.minUnit,
    maxDaysPerRequest: type.maxDaysPerRequest === null ? "" : String(Number(type.maxDaysPerRequest)),
    requiresDocument: type.requiresDocument,
    gender: type.gender,
    allowDuringProbation: type.allowDuringProbation,
    sortOrder: String(type.sortOrder)
  };
}

function LeaveTypeForm({ type, onDone }: { type: LeaveType | null; onDone: () => void }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(type ? toDraft(type) : EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  return (
    <form
      className="leave-type-form"
      aria-label={type ? `Sửa ${type.name}` : "Thêm loại nghỉ"}
      onSubmit={(event) => {
        event.preventDefault();
        const input: LeaveTypeInput = {
          name: draft.name.trim(),
          paid: draft.paid,
          deductsBalance: draft.deductsBalance,
          minUnit: draft.minUnit,
          maxDaysPerRequest: draft.maxDaysPerRequest.trim() ? Number(draft.maxDaysPerRequest.replace(",", ".")) : null,
          requiresDocument: draft.requiresDocument,
          gender: draft.gender,
          allowDuringProbation: draft.allowDuringProbation,
          sortOrder: Number(draft.sortOrder) || 0,
          ...(type ? {} : { code: draft.code.trim() })
        };
        setError(null);
        startSaving(async () => {
          const result = await saveLeaveTypeAction(type?.id ?? null, input);
          if (!result.ok) return setError(result.error);
          onDone();
          router.refresh();
        });
      }}
    >
      {!type ? (
        <label>
          <span>Mã</span>
          <input value={draft.code} onChange={(event) => set("code", event.target.value)} placeholder="vd study" required />
        </label>
      ) : null}
      <label>
        <span>Tên</span>
        <input value={draft.name} onChange={(event) => set("name", event.target.value)} required minLength={2} />
      </label>
      <label>
        <span>Nghỉ tối thiểu</span>
        <select value={draft.minUnit} onChange={(event) => set("minUnit", event.target.value as Draft["minUnit"])}>
          {Object.entries(MIN_UNIT_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label>
        <span>Tối đa mỗi đơn (ngày)</span>
        <input value={draft.maxDaysPerRequest} onChange={(event) => set("maxDaysPerRequest", event.target.value)} inputMode="decimal" placeholder="Không giới hạn" />
      </label>
      <label>
        <span>Áp dụng cho</span>
        <select value={draft.gender} onChange={(event) => set("gender", event.target.value as Draft["gender"])}>
          <option value="all">Tất cả</option>
          <option value="female">Nữ</option>
          <option value="male">Nam</option>
        </select>
      </label>
      <label>
        <span>Thứ tự</span>
        <input value={draft.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} inputMode="numeric" />
      </label>
      <label className="leave-type-check">
        <input type="checkbox" checked={draft.paid} onChange={(event) => set("paid", event.target.checked)} /> Có hưởng lương
      </label>
      <label className="leave-type-check">
        <input type="checkbox" checked={draft.deductsBalance} onChange={(event) => set("deductsBalance", event.target.checked)} /> Trừ quỹ phép
      </label>
      <label className="leave-type-check">
        <input type="checkbox" checked={draft.requiresDocument} onChange={(event) => set("requiresDocument", event.target.checked)} /> Cần giấy tờ
      </label>
      <label className="leave-type-check">
        <input type="checkbox" checked={draft.allowDuringProbation} onChange={(event) => set("allowDuringProbation", event.target.checked)} /> Dùng được khi thử việc
      </label>
      <div className="leave-type-form-actions">
        <button className="primary-button" type="submit" disabled={saving}>
          Lưu
        </button>
        <button className="secondary-button" type="button" onClick={onDone}>
          Đóng
        </button>
        {error ? <span role="alert">{error}</span> : null}
      </div>
    </form>
  );
}

// LV-09: leave types, in the "Đơn từ" module settings.
export function LeaveTypesSettingsBoard({ leaveTypes, error, moduleTabs }: { leaveTypes: LeaveType[]; error?: string; moduleTabs?: ReactNode }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [working, startWorking] = useTransition();

  const archive = (type: LeaveType, status: LeaveType["status"]) =>
    startWorking(async () => {
      const result = await saveLeaveTypeAction(type.id, { status });
      setActionError(result.ok ? null : result.error);
      router.refresh();
    });

  const remove = (type: LeaveType) =>
    startWorking(async () => {
      const result = await deleteLeaveTypeAction(type.id);
      setActionError(result.ok ? null : result.error);
      router.refresh();
    });

  return (
    <main className="requests-board-page leave-types-page" aria-label="Cài đặt loại nghỉ">
      {moduleTabs}
      <header className="requests-toolbar">
        <div className="requests-toolbar-left">
          <strong>Loại nghỉ</strong>
          <span>Mặc định theo Bộ luật Lao động; HR sửa theo quy định của công ty.</span>
        </div>
        <div className="requests-toolbar-right">
          <button className="primary-button" type="button" onClick={() => setEditing("new")}>
            Thêm loại nghỉ
          </button>
        </div>
      </header>
      {error || actionError ? <p role="alert">{error ?? actionError}</p> : null}
      {editing === "new" ? <LeaveTypeForm type={null} onDone={() => setEditing(null)} /> : null}
      <table className="requests-table">
        <thead>
          <tr>
            <th scope="col">Mã</th>
            <th scope="col">Tên</th>
            <th scope="col">Lương</th>
            <th scope="col">Trừ quỹ phép</th>
            <th scope="col">Tối thiểu</th>
            <th scope="col">Tối đa / đơn</th>
            <th scope="col">Thử việc</th>
            <th scope="col">Trạng thái</th>
            <th scope="col" />
          </tr>
        </thead>
        <tbody>
          {leaveTypes.map((type) =>
            editing === type.id ? (
              <tr key={type.id}>
                <td colSpan={9}>
                  <LeaveTypeForm type={type} onDone={() => setEditing(null)} />
                </td>
              </tr>
            ) : (
              <tr key={type.id} className={type.status === "archived" ? "is-archived" : undefined}>
                <td>{type.code}</td>
                <td>{type.name}</td>
                <td>{type.paid ? "Có" : "Không"}</td>
                <td>{type.deductsBalance ? "Có" : "Không"}</td>
                <td>{MIN_UNIT_LABEL[type.minUnit]}</td>
                <td>{type.maxDaysPerRequest === null ? "—" : Number(type.maxDaysPerRequest)}</td>
                <td>{type.allowDuringProbation ? "Được" : "Không"}</td>
                <td>{type.status === "active" ? "Đang dùng" : "Ngừng dùng"}</td>
                <td className="leave-type-actions">
                  <button className="secondary-button" type="button" disabled={working} onClick={() => setEditing(type.id)}>
                    Sửa
                  </button>
                  <button className="secondary-button" type="button" disabled={working} onClick={() => archive(type, type.status === "active" ? "archived" : "active")}>
                    {type.status === "active" ? "Ngừng dùng" : "Dùng lại"}
                  </button>
                  <button className="secondary-button" type="button" disabled={working} onClick={() => remove(type)}>
                    Xoá
                  </button>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </main>
  );
}
