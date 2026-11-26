"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { CaretLeft, CaretRight, MagnifyingGlass, Plus } from "@/lib/icons";
import {
  REQUEST_BOX_LABEL,
  REQUEST_STATUS_LABEL,
  REQUEST_STATUS_TONE,
  formatDate,
  formatDays,
  initials,
  requestRange,
  type RequestBox,
  type RequestList,
  type RequestStatus
} from "@/lib/request-format";

export type RequestsBoardProps = {
  box: RequestBox;
  boxes: RequestBox[];
  toApproveCount: number;
  list: RequestList | null;
  error?: string;
  filters: { status?: string; type?: string; q?: string };
  moduleTabs?: ReactNode;
};

const STATUS_FILTERS: Array<RequestStatus | ""> = ["", "pending", "returned", "approved", "rejected", "draft", "cancelled"];
const TYPE_FILTERS = [
  { value: "", label: "Mọi loại đơn" },
  { value: "leave", label: "Đơn xin nghỉ" }
];

function href(box: RequestBox, filters: RequestsBoardProps["filters"], page = 1) {
  const query = new URLSearchParams({ box });
  if (filters.status) query.set("status", filters.status);
  if (filters.type) query.set("type", filters.type);
  if (filters.q) query.set("q", filters.q);
  if (page > 1) query.set("page", String(page));
  return `/user/requests?${query}` as Route;
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <Badge className={`request-badge request-badge--${status}`} tone={REQUEST_STATUS_TONE[status]}>
      {REQUEST_STATUS_LABEL[status]}
    </Badge>
  );
}

// LV-24 + LV-03 + AP-14: the request list by box (mine, to approve, processed, following, all for HR).
export function RequestsBoard({ box, boxes, toApproveCount, list, error, filters, moduleTabs }: RequestsBoardProps) {
  const router = useRouter();
  const [search, setSearch] = useState(filters.q ?? "");
  const items = list?.items ?? [];
  const showRequester = box !== "mine";
  const open = (id: string) => router.push(`/user/requests/detail?id=${id}` as Route);
  const first = list && list.total > 0 ? (list.page - 1) * list.limit + 1 : 0;
  const last = list ? Math.min(list.total, list.page * list.limit) : 0;

  return (
    <main className="requests-board-page" aria-label="Danh sách đơn từ">
      {moduleTabs}
      <header className="requests-tabs">
        <div className="requests-tab-list" role="tablist" aria-label="Hộp đơn từ">
          {boxes.map((item) => (
            <Link key={item} className={item === box ? "is-active" : undefined} role="tab" aria-selected={item === box} href={href(item, {})}>
              {REQUEST_BOX_LABEL[item]}
              {item === "to_approve" && toApproveCount > 0 ? <span className="requests-tab-count">{toApproveCount}</span> : null}
            </Link>
          ))}
        </div>
        <Link className="primary-button requests-create-button" href={"/user/requests/new?type=leave" as Route}>
          <Plus size={15} weight="bold" aria-hidden="true" />
          Tạo đơn xin nghỉ
        </Link>
      </header>

      <section className="requests-toolbar" aria-label="Công cụ danh sách">
        <div className="requests-toolbar-left">
          <span>{list ? (list.total > 0 ? `Hiển thị ${first} - ${last} / ${list.total} bản ghi` : "Không có đơn nào") : ""}</span>
        </div>
        <form
          className="requests-toolbar-right"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(href(box, { ...filters, q: search.trim() || undefined }));
          }}
        >
          <label className="requests-search">
            <MagnifyingGlass size={16} weight="duotone" aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm mã đơn, tiêu đề, người tạo" aria-label="Tìm đơn" />
          </label>
          <select aria-label="Lọc theo trạng thái" value={filters.status ?? ""} onChange={(event) => router.push(href(box, { ...filters, status: event.target.value || undefined }))}>
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status ? REQUEST_STATUS_LABEL[status] : "Mọi trạng thái"}
              </option>
            ))}
          </select>
          <select aria-label="Lọc theo loại đơn" value={filters.type ?? ""} onChange={(event) => router.push(href(box, { ...filters, type: event.target.value || undefined }))}>
            {TYPE_FILTERS.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </form>
      </section>

      {error ? <p className="requests-error" role="alert">{error}</p> : null}

      <section className="requests-table-shell" aria-labelledby="requests-table-title">
        <h2 className="sr-only" id="requests-table-title">
          {REQUEST_BOX_LABEL[box]}
        </h2>
        <table className="requests-table">
          <thead>
            <tr>
              <th scope="col">Mã đơn</th>
              {showRequester ? <th scope="col">Người tạo</th> : null}
              {showRequester ? <th scope="col">Phòng ban</th> : null}
              <th scope="col">Loại đơn</th>
              <th scope="col">Thời gian</th>
              <th scope="col">Số ngày</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Bước duyệt</th>
              <th scope="col">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr
                className={`requests-table-row-link${row.myStepId ? " is-mine-to-approve" : ""}`}
                key={row.id}
                tabIndex={0}
                aria-label={`Mở ${row.title} ${row.code}`}
                onClick={() => open(row.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    open(row.id);
                  }
                }}
              >
                <td>
                  <Link className="request-table-link" href={`/user/requests/detail?id=${row.id}` as Route} onClick={(event) => event.stopPropagation()}>
                    {row.code}
                  </Link>
                </td>
                {showRequester ? (
                  <td>
                    <span className="request-person">
                      <span className="request-avatar">{initials(row.requester.fullName)}</span>
                      {row.requester.fullName}
                    </span>
                  </td>
                ) : null}
                {showRequester ? <td>{row.requester.department?.name ?? ""}</td> : null}
                <td>{row.title}</td>
                <td>{requestRange(row)}</td>
                <td>{row.unit === "day" ? formatDays(row.quantity) : row.quantity ?? ""}</td>
                <td>
                  <StatusBadge status={row.status} />
                  {row.needsAttention ? <span className="request-flag" title="Cần admin kiểm tra quy trình"> !</span> : null}
                </td>
                <td>
                  {row.currentStep ? (
                    <span className="request-step" title={row.currentStep.assignees.map((person) => person.fullName).join(", ")}>
                      {row.currentStep.name} · {row.currentStep.assignees.map((person) => person.fullName).join(", ")}
                    </span>
                  ) : (
                    ""
                  )}
                </td>
                <td>{formatDate(row.createdAt)}</td>
              </tr>
            ))}
            {items.length === 0 && !error ? (
              <tr>
                <td className="requests-empty" colSpan={showRequester ? 9 : 7}>
                  {box === "to_approve" ? "Không có đơn nào đang chờ bạn duyệt." : "Chưa có đơn nào."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>

      {list && list.pageCount > 1 ? (
        <nav className="requests-pagination" aria-label="Phân trang">
          {list.page > 1 ? (
            <Link href={href(box, filters, list.page - 1)} aria-label="Trang trước">
              <CaretLeft size={14} aria-hidden="true" />
            </Link>
          ) : null}
          <span>
            Trang {list.page} / {list.pageCount}
          </span>
          {list.page < list.pageCount ? (
            <Link href={href(box, filters, list.page + 1)} aria-label="Trang sau">
              <CaretRight size={14} aria-hidden="true" />
            </Link>
          ) : null}
        </nav>
      ) : null}
    </main>
  );
}
