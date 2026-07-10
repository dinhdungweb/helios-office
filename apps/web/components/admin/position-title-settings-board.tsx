import {
  Briefcase,
  ClipboardText,
  CurrencyDollar,
  Export,
  FlowArrow,
  ListNumbers,
  Medal,
  Plus,
  Tag,
  UploadSimple,
  Users
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import {
  organizationCatalog,
  type OrganizationCatalogItem
} from "@/lib/mock-data";

const statusLabels: Record<OrganizationCatalogItem["status"], string> = {
  active: "Hoạt động",
  paused: "Ngưng"
};

const typeLabels: Record<OrganizationCatalogItem["type"], string> = {
  position: "Vị trí",
  title: "Chức vụ"
};

const positionItems = organizationCatalog.filter((item) => item.type === "position");
const titleItems = organizationCatalog.filter((item) => item.type === "title");
const activeItems = organizationCatalog.filter((item) => item.status === "active");
const selectedItem = positionItems.find((item) => item.id === "pos-sales") ?? positionItems[0];

function StatusBadge({ status }: { status: OrganizationCatalogItem["status"] }) {
  return (
    <span className={status === "active" ? "org-status org-status--active" : "org-status org-status--paused"}>
      {statusLabels[status]}
    </span>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="position-tag-list">
      {tags.map((tag) => (
        <span key={tag}>{tag}</span>
      ))}
    </div>
  );
}

function PositionTitleSummary() {
  const summaryItems = [
    { label: "Vị trí", value: positionItems.length, icon: Briefcase },
    { label: "Chức vụ", value: titleItems.length, icon: Medal },
    { label: "Đang dùng", value: activeItems.length, icon: Users },
    { label: "Có ngạch lương", value: organizationCatalog.length, icon: CurrencyDollar }
  ];

  return (
    <section className="org-summary-grid" aria-label="Tổng quan vị trí và chức vụ">
      {summaryItems.map((item) => (
        <article className="org-summary-card" key={item.label}>
          <span>
            <item.icon size={19} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <strong>{item.value}</strong>
            <p>{item.label}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

function CatalogPanel({
  title,
  summary,
  items,
  icon: PanelIcon
}: {
  title: string;
  summary: string;
  items: OrganizationCatalogItem[];
  icon: Icon;
}) {
  return (
    <section className="org-panel" aria-labelledby={`${items[0]?.type ?? "catalog"}-catalog-title`}>
      <header className="org-panel-header">
        <div>
          <h2 id={`${items[0]?.type ?? "catalog"}-catalog-title`}>{title}</h2>
          <p>{summary}</p>
        </div>
        <div className="org-panel-actions">
          <button className="secondary-button" type="button">
            <UploadSimple size={16} weight="duotone" aria-hidden="true" />
            Import
          </button>
          <button className="secondary-button" type="button">
            <Export size={16} weight="duotone" aria-hidden="true" />
            Export
          </button>
          <button className="primary-button" type="button">
            <Plus size={16} weight="duotone" aria-hidden="true" />
            Thêm mới
          </button>
        </div>
      </header>

      <div className="position-catalog-table-shell" tabIndex={0} aria-label={`${title} có thể cuộn ngang`}>
        <table className="position-catalog-table">
          <thead>
            <tr>
              <th scope="col">Danh mục</th>
              <th scope="col">JD & năng lực</th>
              <th scope="col">Tham số lương</th>
              <th scope="col">Duyệt tự động</th>
              <th scope="col">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <th scope="row">
                  <div className="position-catalog-name">
                    <span>
                      <PanelIcon size={17} weight="duotone" aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{item.name}</strong>
                      <small>{item.code} · {item.group}</small>
                    </div>
                  </div>
                </th>
                <td>
                  <p>{item.jobDescription}</p>
                  <TagList tags={item.competencies.slice(0, 2)} />
                </td>
                <td>
                  <strong>{item.salaryGrade}</strong>
                  <small>{item.workdays} công chuẩn · {item.allowance}</small>
                </td>
                <td>
                  <strong>{item.approvalWeight}</strong>
                  <small>Trọng số quy trình</small>
                </td>
                <td>
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SelectedDetailPanel() {
  return (
    <section className="org-panel" aria-labelledby="position-detail-title">
      <header className="org-panel-header">
        <div>
          <h2 id="position-detail-title">{selectedItem.name}</h2>
          <p>{selectedItem.code} · {typeLabels[selectedItem.type]}</p>
        </div>
        <StatusBadge status={selectedItem.status} />
      </header>

      <dl className="org-detail-list position-detail-list">
        <div>
          <dt>Mô tả ngắn</dt>
          <dd>{selectedItem.summary}</dd>
        </div>
        <div>
          <dt>Công chuẩn</dt>
          <dd>{selectedItem.workdays} ngày/tháng</dd>
        </div>
        <div>
          <dt>Bậc lương</dt>
          <dd>{selectedItem.salaryGrade}</dd>
        </div>
        <div>
          <dt>Phụ cấp</dt>
          <dd>{selectedItem.allowance}</dd>
        </div>
        <div>
          <dt>Mã tính lương</dt>
          <dd>{selectedItem.payrollCode}</dd>
        </div>
        <div>
          <dt>Mã phân quyền</dt>
          <dd>{selectedItem.permissionCode}</dd>
        </div>
      </dl>

      <div className="position-detail-section">
        <h3>JD</h3>
        <p>{selectedItem.jobDescription}</p>
      </div>

      <div className="position-detail-section">
        <h3>Yêu cầu năng lực</h3>
        <TagList tags={selectedItem.competencies} />
      </div>
    </section>
  );
}

function SupportPanel() {
  const actions = [
    {
      title: "Import từ Excel",
      body: "Tải lên hàng trăm vị trí hoặc chức vụ cùng lúc bằng mã định danh duy nhất.",
      icon: UploadSimple
    },
    {
      title: "Nhân bản cấu hình",
      body: "Tạo nhanh danh mục mới dựa trên JD, ngạch lương và quyền đã có.",
      icon: ClipboardText
    },
    {
      title: "Phân loại Tag",
      body: "Gắn nhãn theo khối văn phòng, khối sản xuất, kinh doanh hoặc nhóm mục tiêu.",
      icon: Tag
    }
  ];

  return (
    <section className="org-panel" aria-labelledby="position-support-title">
      <header className="org-panel-header">
        <div>
          <h2 id="position-support-title">Tính năng hỗ trợ</h2>
          <p>Nhập liệu nhanh, tái sử dụng cấu hình và phân loại danh mục.</p>
        </div>
      </header>

      <div className="position-support-list">
        {actions.map((action) => (
          <article key={action.title}>
            <span>
              <action.icon size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{action.title}</h3>
              <p>{action.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PositionTitleImpactPanel() {
  const items = [
    {
      title: "Vị trí",
      body: "Trả lời câu hỏi nhân sự làm nghề gì, ví dụ Sales, Kế toán hoặc Lập trình viên.",
      icon: Briefcase
    },
    {
      title: "Chức vụ",
      body: "Trả lời câu hỏi nhân sự đang ở cấp bậc nào trong sơ đồ quyền hạn.",
      icon: Medal
    },
    {
      title: "Quy trình duyệt",
      body: "Trọng số chức vụ giúp hệ thống tự đẩy đơn từ từ cấp thấp lên cấp cao hơn.",
      icon: FlowArrow
    },
    {
      title: "Công thức lương",
      body: "Mã vị trí, ngạch lương và phụ cấp là đầu vào cho bảng lương và import dữ liệu.",
      icon: ListNumbers
    }
  ];

  return (
    <section className="position-impact-panel" aria-label="Ý nghĩa của vị trí và chức vụ">
      {items.map((item) => (
        <article key={item.title}>
          <span>
            <item.icon size={18} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <h3>{item.title}</h3>
            <p>{item.body}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

export function PositionTitleSettingsBoard() {
  return (
    <main className="org-chart-settings-page position-title-settings-page" aria-label="Cài đặt vị trí và chức vụ">
      <section className="org-page-heading" aria-labelledby="position-title-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="position-title-page-title">Vị trí & chức vụ</h1>
          <p>Định nghĩa nhãn chuyên môn, cấp bậc, mã tính lương, trọng số duyệt và năng lực gắn vào hồ sơ nhân sự.</p>
        </div>
        <a className="secondary-button" href="/admin/settings#system-settings">
          Quay lại cài đặt
        </a>
      </section>

      <PositionTitleSummary />

      <section className="org-settings-layout position-settings-layout" aria-label="Thiết lập vị trí và chức vụ">
        <div className="org-settings-main">
          <CatalogPanel
            icon={Briefcase}
            items={positionItems}
            summary="Vị trí đại diện cho nghề nghiệp hoặc chuyên môn của nhân viên."
            title="Danh mục vị trí"
          />
          <CatalogPanel
            icon={Medal}
            items={titleItems}
            summary="Chức vụ đại diện cho cấp bậc, quyền hạn và thứ tự phê duyệt."
            title="Danh mục chức vụ"
          />
        </div>
        <aside className="org-settings-side" aria-label="Chi tiết và hỗ trợ">
          <SelectedDetailPanel />
          <SupportPanel />
        </aside>
      </section>

      <PositionTitleImpactPanel />
    </main>
  );
}
