import {
  CalendarBlank,
  CaretDown,
  Columns,
  Export,
  FunnelSimple,
  GearSix,
  List,
  SlidersHorizontal,
  Tag
} from "@phosphor-icons/react/dist/ssr";

type RequestRow = {
  id: string;
  avatar: string;
  employeeCode: string;
  employeeName: string;
  status: "pending" | "approved";
  step: "manager" | "board";
  type: string;
  department: string;
  position: string;
  reason: string;
  createdAt: string;
};

const requestRows: RequestRow[] = [
  { id: "REQ-001", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "pending", step: "manager", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "03/07/2026" },
  { id: "REQ-002", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "26/06/2026" },
  { id: "REQ-003", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "18/06/2026" },
  { id: "REQ-004", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "12/06/2026" },
  { id: "REQ-005", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "05/06/2026" },
  { id: "REQ-006", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn vắng mặt", department: "Phòng MKT", position: "Web", reason: "Việc cá nhân", createdAt: "01/06/2026" },
  { id: "REQ-007", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "29/05/2026" },
  { id: "REQ-008", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "26/05/2026" },
  { id: "REQ-009", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "22/05/2026" },
  { id: "REQ-010", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "15/05/2026" },
  { id: "REQ-011", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Xin làm online", createdAt: "08/05/2026" },
  { id: "REQ-012", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn xin nghỉ", department: "Phòng MKT", position: "Web", reason: "Nghỉ phép năm", createdAt: "29/04/2026" },
  { id: "REQ-013", avatar: "DD", employeeCode: "SRG-035", employeeName: "Đặng Đình Dũng", status: "approved", step: "board", type: "Đơn vắng mặt", department: "Phòng MKT", position: "Web", reason: "Việc cá nhân", createdAt: "29/04/2026" }
];

function StatusBadge({ status }: { status: RequestRow["status"] }) {
  if (status === "pending") {
    return <span className="request-badge request-badge--pending">Chờ duyệt</span>;
  }

  return <span className="request-badge request-badge--approved">Đã duyệt</span>;
}

function StepBadge({ step }: { step: RequestRow["step"] }) {
  if (step === "manager") {
    return <span className="request-badge request-badge--pending">Quản lý ⏱</span>;
  }

  return <span className="request-badge request-badge--approved">BGĐ ✓</span>;
}

export function RequestsBoard() {
  return (
    <main className="requests-board-page" aria-label="Danh sách đơn từ">
      <header className="requests-tabs">
        <button className="requests-menu-button" type="button" aria-label="Mở menu danh sách">
          <List size={18} weight="duotone" aria-hidden="true" />
        </button>
        <div className="requests-tab-list" role="tablist" aria-label="Trạng thái đơn từ">
          <button className="is-active" type="button" role="tab" aria-selected="true">
            Tất cả (27)
          </button>
        </div>
      </header>

      <section className="requests-toolbar" aria-label="Công cụ danh sách">
        <div className="requests-toolbar-left">
          <button className="icon-button" type="button" aria-label="Bộ lọc nâng cao">
            <SlidersHorizontal size={18} weight="duotone" aria-hidden="true" />
          </button>
          <button className="icon-button" type="button" aria-label="Tùy chọn cột">
            <Columns size={18} weight="duotone" aria-hidden="true" />
          </button>
          <span>Hiển thị 1 - 27 / 27 bản ghi</span>
        </div>

        <div className="requests-toolbar-right">
          <button type="button">
            <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
            2026
            <CaretDown size={13} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button">
            <FunnelSimple size={16} weight="duotone" aria-hidden="true" />
            Lọc nhanh
            <CaretDown size={13} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button">
            <Tag size={16} weight="duotone" aria-hidden="true" />
            Nhãn
          </button>
          <button type="button">
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
          <button type="button">
            <GearSix size={16} weight="duotone" aria-hidden="true" />
            Cài đặt
          </button>
        </div>
      </section>

      <section className="requests-table-shell" aria-labelledby="requests-table-title">
        <h2 className="sr-only" id="requests-table-title">
          Bảng danh sách đơn từ năm 2026
        </h2>
        <table className="requests-table">
          <thead>
            <tr>
              <th scope="col">
                <span className="request-checkbox" aria-hidden="true" />
                <span className="sr-only">Chọn tất cả</span>
              </th>
              <th scope="col">Người tạo</th>
              <th scope="col">Mã NV</th>
              <th scope="col">Họ và tên</th>
              <th scope="col">Trạng thái</th>
              <th scope="col">Bước duyệt</th>
              <th scope="col">Loại đơn</th>
              <th scope="col">Phòng ban</th>
              <th scope="col">Vị trí</th>
              <th scope="col">Lý do</th>
              <th scope="col">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {requestRows.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="request-checkbox" aria-hidden="true" />
                </td>
                <td>
                  <span className="request-avatar">{row.avatar}</span>
                </td>
                <td>{row.employeeCode}</td>
                <td>{row.employeeName}</td>
                <td>
                  <StatusBadge status={row.status} />
                </td>
                <td>
                  <StepBadge step={row.step} />
                </td>
                <td>{row.type}</td>
                <td>{row.department}</td>
                <td>{row.position}</td>
                <td>{row.reason}</td>
                <td>{row.createdAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
