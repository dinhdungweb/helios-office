"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { adjustBalanceAction } from "@/lib/request-actions";
import { formatDate, type BalanceList, type LeaveBalance } from "@/lib/request-format";

const n = (value: number) => value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

function BalanceTable({ balances }: { balances: LeaveBalance[] }) {
  if (balances.length === 0) return <p className="leave-balances-empty">Chưa có loại nghỉ nào dùng quỹ phép.</p>;
  return (
    <table className="requests-table leave-balances-table">
      <thead>
        <tr>
          <th scope="col">Loại nghỉ</th>
          <th scope="col">Được cộng</th>
          <th scope="col">Phép tồn</th>
          <th scope="col">Điều chỉnh</th>
          <th scope="col">Đã dùng</th>
          <th scope="col">Đang chờ duyệt</th>
          <th scope="col">Hết hạn</th>
          <th scope="col">Còn lại</th>
        </tr>
      </thead>
      <tbody>
        {balances.map((balance) => (
          <tr key={balance.leaveType.id}>
            <td>{balance.leaveType.name}</td>
            <td>{n(balance.entitled)}</td>
            <td>
              {n(balance.carriedOver)}
              {balance.carryOverExpiresAt && balance.carriedOver > 0 ? <small> (hạn {formatDate(balance.carryOverExpiresAt)})</small> : null}
            </td>
            <td>{n(balance.adjusted)}</td>
            <td>{n(balance.used)}</td>
            <td>{n(balance.pending)}</td>
            <td>{n(balance.expired)}</td>
            <td>
              <strong>{n(balance.available)}</strong>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function AdjustForm({ employeeId, employeeName, balances, year, onDone }: { employeeId: string; employeeName: string; balances: LeaveBalance[]; year: number; onDone: () => void }) {
  const router = useRouter();
  const [leaveTypeId, setLeaveTypeId] = useState(balances[0]?.leaveType.id ?? "");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  return (
    <form
      className="leave-adjust-form"
      aria-label={`Điều chỉnh quỹ phép của ${employeeName}`}
      onSubmit={(event) => {
        event.preventDefault();
        const value = Number(amount.replace(",", "."));
        if (!Number.isFinite(value) || value === 0) return setError("Nhập số ngày khác 0 (số âm để trừ).");
        if (!reason.trim()) return setError("Hãy nhập lý do điều chỉnh.");
        setError(null);
        startSaving(async () => {
          const result = await adjustBalanceAction({ employeeId, leaveTypeId, year, amount: value, reason: reason.trim() });
          if (!result.ok) return setError(result.error);
          onDone();
          router.refresh();
        });
      }}
    >
      <select value={leaveTypeId} onChange={(event) => setLeaveTypeId(event.target.value)} aria-label="Loại nghỉ">
        {balances.map((balance) => (
          <option key={balance.leaveType.id} value={balance.leaveType.id}>
            {balance.leaveType.name}
          </option>
        ))}
      </select>
      <input value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="Số ngày, vd 1,5 hoặc -1" aria-label="Số ngày điều chỉnh" />
      <input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Lý do" maxLength={1000} aria-label="Lý do điều chỉnh" />
      <button className="primary-button" type="submit" disabled={saving}>
        Lưu
      </button>
      <button className="secondary-button" type="button" onClick={onDone}>
        Đóng
      </button>
      {error ? <span role="alert">{error}</span> : null}
    </form>
  );
}

// LV-10 → LV-12: my balance, and for HR the balances of people in scope with manual adjustments.
export function LeaveBalancesBoard({
  year,
  mine,
  mineError,
  list,
  listError,
  canAdjust,
  q,
  moduleTabs
}: {
  year: number;
  mine: LeaveBalance[];
  mineError?: string;
  list: BalanceList | null;
  listError?: string;
  canAdjust: boolean;
  q?: string;
  moduleTabs?: ReactNode;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(q ?? "");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const showList = list !== null || listError;
  const link = (nextYear: number, query = q) => `/user/requests/balances?year=${nextYear}${query ? `&q=${encodeURIComponent(query)}` : ""}` as Route;

  return (
    <main className="requests-board-page leave-balances-page" aria-label="Quỹ phép">
      {moduleTabs}
      <header className="requests-toolbar">
        <div className="requests-toolbar-left">
          <Link href={link(year - 1)} aria-label="Năm trước">
            ‹
          </Link>
          <strong>Năm {year}</strong>
          <Link href={link(year + 1)} aria-label="Năm sau">
            ›
          </Link>
        </div>
      </header>

      <section className="leave-balances-section" aria-labelledby="my-balance-title">
        <h2 id="my-balance-title">Quỹ phép của tôi</h2>
        {mineError ? <p role="alert">{mineError}</p> : <BalanceTable balances={mine} />}
        <p className="leave-type-hint">Phép năm được cộng dồn mỗi tháng; phép tồn năm trước được dùng trước và hết hạn ngày 31/03.</p>
      </section>

      {showList ? (
        <section className="leave-balances-section" aria-labelledby="all-balance-title">
          <h2 id="all-balance-title">Quỹ phép nhân sự</h2>
          <form
            className="requests-toolbar-right"
            onSubmit={(event) => {
              event.preventDefault();
              router.push(link(year, search.trim() || undefined));
            }}
          >
            <input className="requests-search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm tên hoặc mã nhân viên" aria-label="Tìm nhân viên" />
          </form>
          {listError ? (
            <p role="alert">{listError}</p>
          ) : (
            <table className="requests-table leave-balances-table">
              <thead>
                <tr>
                  <th scope="col">Nhân viên</th>
                  <th scope="col">Phòng ban</th>
                  {(list?.items[0]?.balances ?? []).map((balance) => (
                    <th scope="col" key={balance.leaveType.id}>
                      {balance.leaveType.name} (còn / đã dùng / chờ)
                    </th>
                  ))}
                  {canAdjust ? <th scope="col" /> : null}
                </tr>
              </thead>
              <tbody>
                {(list?.items ?? []).map((row) => (
                  <tr key={row.employee.id}>
                    <td>
                      {row.employee.fullName} <small>{row.employee.code}</small>
                    </td>
                    <td>{row.employee.department?.name ?? ""}</td>
                    {row.balances.map((balance) => (
                      <td key={balance.leaveType.id}>
                        <strong>{n(balance.available)}</strong> / {n(balance.used)} / {n(balance.pending)}
                      </td>
                    ))}
                    {canAdjust ? (
                      <td>
                        {adjusting === row.employee.id ? (
                          <AdjustForm employeeId={row.employee.id} employeeName={row.employee.fullName} balances={row.balances} year={year} onDone={() => setAdjusting(null)} />
                        ) : (
                          <button className="secondary-button" type="button" onClick={() => setAdjusting(row.employee.id)}>
                            Điều chỉnh
                          </button>
                        )}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </main>
  );
}
