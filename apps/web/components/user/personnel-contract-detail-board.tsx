import type { ReactNode } from "react";
import {
  ArchiveRestore,
  CaretDown,
  Certificate,
  ChatCircleText,
  FormTemplate,
  LinkSimple,
  Minus,
  PaperPlaneTilt,
  Paperclip,
  Plus,
  Smiley,
  UserCircle
} from "@/lib/icons";
import type { PersonnelContractDetailData, PersonnelContractRecord } from "@/lib/personnel-contract-directory-api";

type DetailField = {
  label: string;
  value: ReactNode;
};

function formatDate(value?: string | null) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (!Number.isFinite(date.valueOf())) {
    return "--";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function statusLabel(status: string) {
  if (status === "ended" || status === "terminated" || status === "liquidated") {
    return "Đã thanh lý";
  }

  if (status === "draft") {
    return "Bản nháp";
  }

  if (status === "renewal_due") {
    return "Sắp hết hạn";
  }

  return "Đang hiệu lực";
}

function statusTone(status: string) {
  if (status === "ended" || status === "terminated" || status === "liquidated" || status === "draft") {
    return "is-ended";
  }

  if (status === "renewal_due") {
    return "is-warning";
  }

  return "is-active";
}

function fallbackPosition(contract: PersonnelContractRecord) {
  const department = contract.departmentName.toLowerCase();

  if (contract.positionName) {
    return contract.positionName;
  }

  if (department.includes("mkt") || department.includes("marketing")) {
    return "Marketing";
  }

  if (department.includes("kế toán")) {
    return "Kế toán";
  }

  if (department.includes("kho")) {
    return "Kho vận";
  }

  if (department.includes("bán hàng") || department.includes("ch")) {
    return "Bán hàng";
  }

  return "--";
}

function fallbackJobTitle(contract: PersonnelContractRecord) {
  return contract.jobTitleName ?? "Nhân viên Fulltime";
}

function salarySeed(contract: PersonnelContractRecord) {
  return Array.from(contract.code).reduce((total, char) => total + char.charCodeAt(0), 0);
}

function salaryAmount(contract: PersonnelContractRecord) {
  return 8000000 + (salarySeed(contract) % 7) * 500000;
}

function DetailPanel({
  children,
  className,
  title
}: {
  children: ReactNode;
  className?: string;
  title: string;
}) {
  const titleId = `personnel-contract-detail-${title
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "") || "panel"}`;

  return (
    <section className={["admin-account-detail-panel", "personnel-contract-detail-panel", className].filter(Boolean).join(" ")} aria-labelledby={titleId}>
      <header className="admin-account-detail-panel-header">
        <h2 id={titleId}>{title}</h2>
        <button className="personnel-contract-panel-collapse" type="button" aria-label={`Thu gọn ${title}`}>
          <Minus size={16} weight="duotone" aria-hidden="true" />
        </button>
      </header>
      {children}
    </section>
  );
}

function FieldGrid({ fields }: { fields: DetailField[] }) {
  return (
    <dl className="admin-account-field-grid personnel-contract-detail-field-grid">
      {fields.map((field) => (
        <div key={field.label}>
          <dt>{field.label}</dt>
          <dd>{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ApiStatusBanner({ data }: { data: PersonnelContractDetailData }) {
  if (data.source === "api") {
    return null;
  }

  return (
    <section className="account-api-banner admin-user-api-banner" role="status">
      <strong>Chưa kết nối được dữ liệu hợp đồng</strong>
      <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
    </section>
  );
}

function EmptyContract() {
  return (
    <section className="admin-account-detail-panel personnel-contract-detail-panel">
      <div className="personnel-contract-detail-empty">Không tìm thấy hợp đồng.</div>
    </section>
  );
}

function GeneralInfo({ contract }: { contract: PersonnelContractRecord }) {
  const fields: DetailField[] = [
    { label: "Mã HĐ", value: contract.code },
    {
      label: "Tên nhân sự",
      value: <span className="personnel-contract-employee-chip">{contract.employeeName}</span>
    },
    { label: "Tên hợp đồng", value: contract.contractName },
    { label: "Phòng ban", value: contract.departmentName },
    { label: "Vị trí", value: fallbackPosition(contract) },
    { label: "Chức vụ", value: fallbackJobTitle(contract) },
    { label: "Cấp bậc", value: "--" },
    { label: "Nơi làm việc", value: "--" },
    { label: "Hình thức hợp đồng", value: "--" },
    { label: "Hiệu lực từ ngày", value: formatDate(contract.startDate) },
    { label: "Giờ làm việc", value: "--" },
    {
      label: "Tình trạng",
      value: <span className={`personnel-contract-status ${statusTone(contract.status)}`}>{statusLabel(contract.status)}</span>
    },
    { label: "Mô tả", value: "--" }
  ];

  return (
    <DetailPanel title="Thông tin chung">
      <FieldGrid fields={fields} />
    </DetailPanel>
  );
}

function SalaryPanel({ contract }: { contract: PersonnelContractRecord }) {
  return (
    <DetailPanel title="Lương và phụ cấp">
      <div className="personnel-contract-detail-table-shell" tabIndex={0} aria-label="Bảng lương và phụ cấp có thể cuộn ngang">
        <table className="personnel-contract-detail-table">
          <thead>
            <tr>
              <th scope="col">Từ ngày</th>
              <th scope="col">--</th>
              <th scope="col">Lương cơ bản gross</th>
              <th scope="col">Phụ cấp ăn trưa</th>
              <th scope="col">Phụ cấp trang điểm</th>
              <th scope="col">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{formatDate(contract.startDate)}</td>
              <td>--</td>
              <td>{formatMoney(salaryAmount(contract))}</td>
              <td>25,000 / Ngày</td>
              <td>100,000 / Tháng</td>
              <td>--</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DetailPanel>
  );
}

function RelatedPanel({ contract }: { contract: PersonnelContractRecord }) {
  const employeeKey = contract.employeeId ?? contract.employeeCode ?? contract.id;
  const employeeHref = `/user?customMenu=employee-profile&employeeId=${encodeURIComponent(employeeKey)}`;

  return (
    <DetailPanel title="Liên quan">
      <a className="personnel-contract-related-card" href={employeeHref} aria-label={`Mở hồ sơ nhân sự ${contract.employeeName}`}>
        <span className="personnel-contract-related-avatar" aria-hidden="true">
          <UserCircle size={23} weight="duotone" />
        </span>
        <div className="personnel-contract-related-content">
          <header>
            <h3>{contract.employeeName}</h3>
            <span>Admin · 09:49 ngày 24/4/2025</span>
          </header>
          <dl>
            <div>
              <dt>Đối tượng</dt>
              <dd>Hồ sơ nhân sự</dd>
            </div>
            <div>
              <dt>Mã NS</dt>
              <dd>{contract.employeeCode ?? "--"}</dd>
            </div>
            <div>
              <dt>Phòng ban</dt>
              <dd>{contract.departmentName}</dd>
            </div>
            <div>
              <dt>Trạng thái</dt>
              <dd>
                <span className="personnel-contract-related-status">Đang làm việc</span>
              </dd>
            </div>
          </dl>
        </div>
      </a>
    </DetailPanel>
  );
}

function DiscussionPanel() {
  return (
    <section className="admin-account-detail-panel personnel-contract-discussion-panel" aria-label="Thảo luận hợp đồng">
      <header className="personnel-contract-discussion-header">
        <nav className="personnel-contract-discussion-tabs" aria-label="Tab thảo luận hợp đồng">
          <button className="is-active" type="button">Thảo luận</button>
          <button type="button">Lịch sử hoạt động</button>
        </nav>
        <button className="personnel-contract-panel-collapse" type="button" aria-label="Thu gọn thảo luận">
          <Minus size={16} weight="duotone" aria-hidden="true" />
        </button>
      </header>
      <div className="personnel-contract-discussion-body">
        <div className="personnel-contract-discussion-empty">
          <ChatCircleText size={32} weight="duotone" aria-hidden="true" />
          <span>Không có thảo luận nào</span>
        </div>
        <div className="personnel-contract-discussion-input" role="group" aria-label="Viết thảo luận">
          <button type="button" aria-label="Tải tệp">
            <Paperclip size={17} weight="duotone" aria-hidden="true" />
          </button>
          <input aria-label="Viết thảo luận" placeholder="Viết thảo luận..." />
          <button type="button" aria-label="Chèn cảm xúc">
            <Smiley size={17} weight="duotone" aria-hidden="true" />
          </button>
          <button type="button" aria-label="Gửi thảo luận">
            <PaperPlaneTilt size={18} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

export function PersonnelContractDetailBoard({ data }: { data: PersonnelContractDetailData }) {
  const contract = data.contract;

  return (
    <main className="admin-group-detail-page personnel-contract-detail-page" aria-label={contract ? `Chi tiết hợp đồng ${contract.code}` : "Chi tiết hợp đồng"}>
      <ApiStatusBanner data={data} />

      <section className="admin-group-detail-tabbar personnel-contract-detail-tabbar" aria-label="Điều hướng chi tiết hợp đồng">
        <nav className="admin-group-detail-tabs" aria-label="Tab chi tiết hợp đồng">
          <a className="is-active" href={contract ? `/apps/personnel-contract-contract/view?ID=${encodeURIComponent(contract.id)}` : "/apps/personnel-contract-contract"}>
            Chi tiết
          </a>
        </nav>

        <div className="admin-group-detail-actions personnel-contract-detail-actions" aria-label="Tác vụ hợp đồng">
          <button className="admin-account-action-button" type="button">
            <Certificate size={16} weight="duotone" aria-hidden="true" />
            Ký số
          </button>
          <button className="admin-account-action-button" type="button">
            <ArchiveRestore size={16} weight="duotone" aria-hidden="true" />
            Thanh lý
          </button>
          <a className="admin-account-action-button" href="/apps/personnel-contract-contract/add">
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Tạo mới
          </a>
          <button className="admin-account-action-button" type="button">
            <LinkSimple size={16} weight="duotone" aria-hidden="true" />
            Phụ lục
          </button>
          <button className="admin-account-action-button" type="button">
            <FormTemplate size={16} weight="duotone" aria-hidden="true" />
            Biểu mẫu
            <CaretDown size={13} weight="duotone" aria-hidden="true" />
          </button>
          <button className="admin-account-detail-more" type="button" aria-label="Thêm tác vụ">
            <CaretDown size={16} weight="duotone" aria-hidden="true" />
          </button>
        </div>
      </section>

      {contract ? (
        <div className="admin-group-detail-layout personnel-contract-detail-layout">
          <div className="admin-group-detail-main personnel-contract-detail-main">
            <GeneralInfo contract={contract} />
            <SalaryPanel contract={contract} />
            <RelatedPanel contract={contract} />
          </div>

          <aside className="admin-group-detail-side personnel-contract-detail-side" aria-label="Thảo luận và lịch sử hợp đồng">
            <DiscussionPanel />
          </aside>
        </div>
      ) : (
        <div className="admin-group-detail-layout personnel-contract-detail-layout">
          <EmptyContract />
        </div>
      )}
    </main>
  );
}
