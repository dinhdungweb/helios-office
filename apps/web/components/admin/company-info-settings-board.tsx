import {
  Bank,
  Buildings,
  CalendarBlank,
  CheckCircle,
  FileText,
  IdentificationBadge,
  Phone,
  SealCheck,
  UploadSimple,
  UserCircle,
  Wallet,
  WarningCircle,
  X
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import {
  companyBankAccounts,
  companyContactInfo,
  companyGeneralConfig,
  companyIdentityInfo,
  companyLegalAssets,
  companyLegalRepresentative,
  companyOffices,
  type CompanyInfoItem,
  type CompanyInfoStatus
} from "@/lib/mock-data";

const statusLabels: Record<CompanyInfoStatus, string> = {
  complete: "Đã khai báo",
  review: "Cần rà soát",
  missing: "Thiếu dữ liệu"
};

const statusIcons: Record<CompanyInfoStatus, Icon> = {
  complete: CheckCircle,
  review: WarningCircle,
  missing: X
};

function CompanyStatusBadge({ status }: { status: CompanyInfoStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <span className={`company-status company-status--${status}`}>
      <StatusIcon size={14} weight="duotone" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function CompanySummary() {
  const completeItems = [
    ...companyIdentityInfo,
    ...companyContactInfo,
    ...companyLegalRepresentative,
    ...companyGeneralConfig
  ].filter((item) => item.status === "complete").length;
  const summaryItems = [
    { label: "Thông tin hoàn tất", value: completeItems, icon: CheckCircle },
    { label: "Văn phòng", value: companyOffices.length, icon: Buildings },
    { label: "Tài khoản ngân hàng", value: companyBankAccounts.length, icon: Bank },
    { label: "Con dấu/chữ ký", value: companyLegalAssets.length, icon: SealCheck }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan thông tin doanh nghiệp">
      {summaryItems.map((item) => (
        <article className="account-summary-card" key={item.label}>
          <span>
            <item.icon size={20} weight="duotone" aria-hidden="true" />
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

function InfoList({
  items,
  icon: RowIcon
}: {
  items: CompanyInfoItem[];
  icon: Icon;
}) {
  return (
    <div className="company-info-list">
      {items.map((item) => (
        <article key={item.id}>
          <span>
            <RowIcon size={17} weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <header>
              <div>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </div>
              <CompanyStatusBadge status={item.status} />
            </header>
            <strong>{item.value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function IdentityPanel() {
  return (
    <section className="account-panel" aria-labelledby="company-identity-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-identity-title">Thông tin định danh cơ bản</h2>
          <p>Bộ nhận diện pháp lý dùng trên văn bản chính thức, hợp đồng và hóa đơn.</p>
        </div>
      </header>

      <InfoList icon={IdentificationBadge} items={companyIdentityInfo} />
    </section>
  );
}

function ContactPanel() {
  return (
    <section className="account-panel" aria-labelledby="company-contact-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-contact-title">Thông tin liên hệ</h2>
          <p>Footer/header trên báo giá, hợp đồng, hóa đơn và đơn từ.</p>
        </div>
      </header>

      <InfoList icon={Phone} items={companyContactInfo} />
    </section>
  );
}

function OfficesPanel() {
  return (
    <section className="account-panel" aria-labelledby="company-office-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-office-title">Văn phòng giao dịch</h2>
          <p>Địa chỉ nhân viên có thể chọn khi lập mẫu đơn từ hoặc chứng từ.</p>
        </div>
      </header>

      <div className="company-office-list">
        {companyOffices.map((office) => (
          <article key={office.id}>
            <span>
              <Buildings size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{office.name}</h3>
              <p>{office.address}</p>
              <small>{office.note}</small>
            </div>
            <strong>{office.type === "headquarters" ? "Trụ sở" : "Văn phòng"}</strong>
          </article>
        ))}
      </div>
    </section>
  );
}

function LegalRepresentativePanel() {
  return (
    <section className="account-panel" aria-labelledby="company-legal-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-legal-title">Đại diện pháp luật</h2>
          <p>Tự động điền vào hợp đồng lao động, hợp đồng kinh tế và ký số.</p>
        </div>
      </header>

      <InfoList icon={UserCircle} items={companyLegalRepresentative} />
    </section>
  );
}

function BankAccountsPanel() {
  return (
    <section className="account-panel" aria-labelledby="company-bank-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-bank-title">Tài khoản ngân hàng</h2>
          <p>Hiển thị trên báo giá, đơn hàng và hướng dẫn chuyển khoản.</p>
        </div>
        <button className="primary-button" type="button">
          <Wallet size={16} weight="duotone" aria-hidden="true" />
          Thêm tài khoản
        </button>
      </header>

      <div className="company-bank-table-shell" tabIndex={0} aria-label="Bảng tài khoản ngân hàng có thể cuộn ngang">
        <table className="company-bank-table">
          <thead>
            <tr>
              <th scope="col">Số tài khoản</th>
              <th scope="col">Ngân hàng</th>
              <th scope="col">Chi nhánh</th>
              <th scope="col">Chủ tài khoản</th>
              <th scope="col">Mặc định</th>
            </tr>
          </thead>
          <tbody>
            {companyBankAccounts.map((account) => (
              <tr key={account.id}>
                <th scope="row">{account.accountNumber}</th>
                <td>{account.bankName}</td>
                <td>{account.branch}</td>
                <td>{account.owner}</td>
                <td>
                  {account.isDefault ? (
                    <span className="company-status company-status--complete">Mặc định</span>
                  ) : (
                    <span className="company-status company-status--review">Dự phòng</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function GeneralConfigPanel() {
  return (
    <section className="account-panel" aria-labelledby="company-general-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-general-title">Cấu hình chung</h2>
          <p>Tài khóa, lĩnh vực hoạt động và cơ chế đồng bộ mẫu in.</p>
        </div>
      </header>

      <InfoList icon={CalendarBlank} items={companyGeneralConfig} />
    </section>
  );
}

function LegalAssetsPanel() {
  return (
    <section className="account-panel" aria-labelledby="company-assets-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-assets-title">Con dấu & chữ ký</h2>
          <p>Ảnh nền trong suốt dùng cho văn bản, hợp đồng điện tử và phê duyệt tự động.</p>
        </div>
        <button className="secondary-button" type="button">
          <UploadSimple size={16} weight="duotone" aria-hidden="true" />
          Tải lên
        </button>
      </header>

      <div className="company-asset-list">
        {companyLegalAssets.map((asset) => (
          <article key={asset.id}>
            <span>
              <SealCheck size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{asset.name}</h3>
              <p>{asset.usage}</p>
              <small>{asset.fileName}</small>
            </div>
            <CompanyStatusBadge status={asset.status} />
          </article>
        ))}
      </div>
    </section>
  );
}

function PrintTemplateSyncPanel() {
  return (
    <section className="group-example-panel company-template-note" aria-label="Lưu ý đồng bộ mẫu in">
      <span>
        <FileText size={18} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <h2>Lưu ý cho Admin</h2>
        <p>Khi cập nhật thông tin doanh nghiệp, hãy kiểm tra lại mẫu in Báo giá, Hợp đồng và Hóa đơn. Hệ thống sẽ tự động đồng bộ các biến như tên công ty, mã số thuế, địa chỉ, tài khoản ngân hàng và người đại diện.</p>
      </div>
    </section>
  );
}

export function CompanyInfoSettingsBoard() {
  return (
    <main className="account-access-page company-info-page" aria-label="Thông tin doanh nghiệp">
      <section className="org-page-heading" aria-labelledby="company-info-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="company-info-page-title">Thông tin doanh nghiệp</h1>
          <p>Khai báo thông tin pháp lý, liên hệ, đại diện, ngân hàng, tài khóa, con dấu và chữ ký dùng cho mẫu in.</p>
        </div>
        <a className="secondary-button" href="/admin/settings#system-settings">
          Quay lại cài đặt
        </a>
      </section>

      <CompanySummary />

      <section className="account-access-layout" aria-label="Thiết lập thông tin doanh nghiệp">
        <div className="account-access-main">
          <IdentityPanel />
          <ContactPanel />
          <BankAccountsPanel />
          <PrintTemplateSyncPanel />
        </div>

        <aside className="account-access-side" aria-label="Pháp lý và cấu hình doanh nghiệp">
          <LegalRepresentativePanel />
          <OfficesPanel />
          <GeneralConfigPanel />
          <LegalAssetsPanel />
        </aside>
      </section>
    </main>
  );
}
