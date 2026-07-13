"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Button, FormField, FormInput, ModalDialog } from "@/components/ui/primitives";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  Bank,
  Buildings,
  CalendarBlank,
  CheckCircle,
  FileText,
  IdentificationBadge,
  PencilSimple,
  Phone,
  SealCheck,
  UploadSimple,
  UserCircle,
  Wallet,
  WarningCircle,
  X
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { updateCompanyInfoAction, type AdminSettingsFormState } from "@/lib/admin-settings-actions";
import type {
  CompanyBankAccount,
  CompanyInfoItem,
  CompanyInfoSettings,
  CompanyInfoSettingsData,
  CompanyInfoStatus,
  CompanyLegalAsset,
  CompanyOffice
} from "@/lib/admin-settings-api";

const initialState: AdminSettingsFormState = {
  ok: false
};

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

const statusTones: Record<CompanyInfoStatus, BadgeTone> = {
  complete: "success",
  missing: "danger",
  review: "warning"
};

const fallbackSettings: CompanyInfoSettings = {
  identityInfo: [],
  contactInfo: [],
  offices: [],
  legalRepresentative: [],
  bankAccounts: [],
  generalConfig: [],
  legalAssets: [],
  status: "needs_review"
};

function findValue(items: CompanyInfoItem[], id: string) {
  return items.find((item) => item.id === id)?.value ?? "";
}

function CompanyStatusBadge({ status }: { status: CompanyInfoStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <Badge
      className={`company-status company-status--${status}`}
      icon={<StatusIcon size={14} weight="duotone" aria-hidden="true" />}
      tone={statusTones[status]}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function CompanySummary({ settings }: { settings: CompanyInfoSettings }) {
  const completeItems = [
    ...settings.identityInfo,
    ...settings.contactInfo,
    ...settings.legalRepresentative,
    ...settings.generalConfig
  ].filter((item) => item.status === "complete").length;
  const summaryItems = [
    { label: "Thông tin hoàn tất", value: completeItems, icon: CheckCircle },
    { label: "Văn phòng", value: settings.offices.length, icon: Buildings },
    { label: "Tài khoản ngân hàng", value: settings.bankAccounts.length, icon: Bank },
    { label: "Con dấu/chữ ký", value: settings.legalAssets.length, icon: SealCheck }
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

function InfoList({ items, icon: RowIcon }: { items: CompanyInfoItem[]; icon: Icon }) {
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

function InfoPanel({
  description,
  icon,
  items,
  title
}: {
  description: string;
  icon: Icon;
  items: CompanyInfoItem[];
  title: string;
}) {
  return (
    <section className="account-panel" aria-label={title}>
      <header className="account-panel-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <InfoList icon={icon} items={items} />
    </section>
  );
}

function OfficesPanel({ offices }: { offices: CompanyOffice[] }) {
  return (
    <section className="account-panel" aria-labelledby="company-office-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-office-title">Văn phòng giao dịch</h2>
          <p>Địa chỉ nhân viên có thể chọn khi lập mẫu đơn từ hoặc chứng từ.</p>
        </div>
      </header>
      <div className="company-office-list">
        {offices.map((office) => (
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

function BankAccountsPanel({ bankAccounts }: { bankAccounts: CompanyBankAccount[] }) {
  return (
    <section className="account-panel" aria-labelledby="company-bank-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-bank-title">Tài khoản ngân hàng</h2>
          <p>Hiển thị trên báo giá, đơn hàng và hướng dẫn chuyển khoản.</p>
        </div>
        <button className="secondary-button" type="button">
          <Wallet size={16} weight="duotone" aria-hidden="true" />
          Quản lý sau
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
            {bankAccounts.map((account) => (
              <tr key={account.id}>
                <th scope="row">{account.accountNumber}</th>
                <td>{account.bankName}</td>
                <td>{account.branch}</td>
                <td>{account.owner}</td>
                <td>
                  <Badge
                    className={`company-status company-status--${account.isDefault ? "complete" : "review"}`}
                    tone={account.isDefault ? "success" : "warning"}
                  >
                    {account.isDefault ? "Mặc định" : "Dự phòng"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function LegalAssetsPanel({ legalAssets }: { legalAssets: CompanyLegalAsset[] }) {
  return (
    <section className="account-panel" aria-labelledby="company-assets-title">
      <header className="account-panel-header">
        <div>
          <h2 id="company-assets-title">Con dấu & chữ ký</h2>
          <p>Ảnh nền trong suốt dùng cho văn bản và hợp đồng điện tử.</p>
        </div>
        <button className="secondary-button" type="button">
          <UploadSimple size={16} weight="duotone" aria-hidden="true" />
          Tải lên sau
        </button>
      </header>
      <div className="company-asset-list">
        {legalAssets.map((asset) => (
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
        <p>Khi cập nhật thông tin doanh nghiệp, hãy kiểm tra lại mẫu in báo giá, hợp đồng và hóa đơn.</p>
      </div>
    </section>
  );
}

function SaveStateMessage({ state }: { state: AdminSettingsFormState }) {
  if (state.ok && state.message) {
    return <p className="employee-create-success" role="status">{state.message}</p>;
  }

  if (state.error) {
    return <p className="employee-create-error" role="alert">{state.error}</p>;
  }

  return null;
}

function CompanyInfoForm({ onClose, settings }: { onClose: () => void; settings: CompanyInfoSettings }) {
  const router = useRouter();
  const handledSuccessRef = useRef(false);
  const [state, formAction, isPending] = useActionState(updateCompanyInfoAction, initialState);

  useEffect(() => {
    if (isPending) {
      handledSuccessRef.current = false;
    }
  }, [isPending]);

  useEffect(() => {
    if (!state.ok || handledSuccessRef.current) {
      return;
    }

    handledSuccessRef.current = true;
    router.refresh();
    onClose();
  }, [onClose, router, state.ok]);

  return (
    <form className="account-dialog-form" action={formAction}>
      <div className="account-dialog-grid">
        <FormField label="Tên doanh nghiệp">
          <FormInput name="companyName" defaultValue={findValue(settings.identityInfo, "company-name")} />
        </FormField>
        <FormField label="Tên viết tắt">
          <FormInput name="shortName" defaultValue={findValue(settings.identityInfo, "company-short-name")} />
        </FormField>
        <FormField label="Mã số thuế">
          <FormInput name="taxCode" defaultValue={findValue(settings.identityInfo, "tax-code")} />
        </FormField>
        <FormField label="Website">
          <FormInput name="website" type="url" defaultValue={findValue(settings.identityInfo, "website")} />
        </FormField>
        <FormField label="Hotline">
          <FormInput name="hotline" defaultValue={findValue(settings.contactInfo, "hotline")} />
        </FormField>
        <FormField label="Email liên hệ">
          <FormInput name="email" type="email" defaultValue={findValue(settings.contactInfo, "email")} />
        </FormField>
        <FormField label="Địa chỉ trụ sở" wide>
          <FormInput name="headOffice" defaultValue={findValue(settings.contactInfo, "head-office")} />
        </FormField>
        <FormField label="Người đại diện">
          <FormInput name="representativeName" defaultValue={findValue(settings.legalRepresentative, "representative-name")} />
        </FormField>
        <FormField label="Chức vụ">
          <FormInput name="representativeTitle" defaultValue={findValue(settings.legalRepresentative, "representative-title")} />
        </FormField>
        <FormField label="Ngày bắt đầu tài khóa">
          <FormInput name="fiscalYear" defaultValue={findValue(settings.generalConfig, "fiscal-year")} />
        </FormField>
        <FormField label="Lĩnh vực hoạt động">
          <FormInput name="industry" defaultValue={findValue(settings.generalConfig, "industry")} />
        </FormField>
        <FormField label="Đồng bộ mẫu in" wide>
          <FormInput name="templateSync" defaultValue={findValue(settings.generalConfig, "template-sync")} />
        </FormField>
      </div>

      <SaveStateMessage state={state} />

      <div className="account-dialog-actions">
        <Button variant="secondary" icon={<X size={16} weight="duotone" aria-hidden="true" />} onClick={onClose}>
          Hủy
        </Button>
        <Button variant="primary" type="submit" disabled={isPending} icon={<CheckCircle size={16} weight="duotone" aria-hidden="true" />}>
          {isPending ? "Đang lưu" : "Lưu"}
        </Button>
      </div>
    </form>
  );
}

function CompanyEditDialog({ settings }: { settings: CompanyInfoSettings }) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const closeDialog = useCallback(() => {
    dialogRef.current?.close();
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <>
      <Button variant="primary" icon={<PencilSimple size={16} weight="duotone" aria-hidden="true" />} onClick={() => dialogRef.current?.showModal()}>
        Sửa thông tin
      </Button>
      {isMounted
        ? createPortal(
            <ModalDialog ref={dialogRef} title="Sửa thông tin doanh nghiệp" onCloseRequest={closeDialog}>
              <CompanyInfoForm settings={settings} onClose={closeDialog} />
            </ModalDialog>,
            document.body
          )
        : null}
    </>
  );
}

export function CompanyInfoSettingsBoard({ data }: { data: CompanyInfoSettingsData }) {
  const settings = data.settings ?? fallbackSettings;

  return (
    <main className="account-access-page company-info-page" aria-label="Thông tin doanh nghiệp">
      {data.source === "unavailable" ? (
        <section className="account-api-banner" role="status">
          <strong>Chưa kết nối được Company API</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      <section className="org-page-heading" aria-labelledby="company-info-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="company-info-page-title">Thông tin doanh nghiệp</h1>
          <p>Khai báo thông tin pháp lý, liên hệ, đại diện, ngân hàng, tài khóa, con dấu và chữ ký dùng cho mẫu in.</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings">
            Quay lại cài đặt
          </a>
          <CompanyEditDialog settings={settings} />
        </div>
      </section>

      <CompanySummary settings={settings} />

      <section className="account-access-layout" aria-label="Thiết lập thông tin doanh nghiệp">
        <div className="account-access-main">
          <InfoPanel
            description="Bộ nhận diện pháp lý dùng trên văn bản chính thức, hợp đồng và hóa đơn."
            icon={IdentificationBadge}
            items={settings.identityInfo}
            title="Thông tin định danh cơ bản"
          />
          <InfoPanel
            description="Footer/header trên báo giá, hợp đồng, hóa đơn và đơn từ."
            icon={Phone}
            items={settings.contactInfo}
            title="Thông tin liên hệ"
          />
          <BankAccountsPanel bankAccounts={settings.bankAccounts} />
          <PrintTemplateSyncPanel />
        </div>

        <aside className="account-access-side" aria-label="Pháp lý và cấu hình doanh nghiệp">
          <InfoPanel
            description="Tự động điền vào hợp đồng lao động, hợp đồng kinh tế và ký số."
            icon={UserCircle}
            items={settings.legalRepresentative}
            title="Đại diện pháp luật"
          />
          <OfficesPanel offices={settings.offices} />
          <InfoPanel
            description="Tài khóa, lĩnh vực hoạt động và cơ chế đồng bộ mẫu in."
            icon={CalendarBlank}
            items={settings.generalConfig}
            title="Cấu hình chung"
          />
          <LegalAssetsPanel legalAssets={settings.legalAssets} />
        </aside>
      </section>
    </main>
  );
}
