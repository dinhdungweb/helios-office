"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { FormSelect, type FormSelectOption } from "@/components/ui/form-controls";
import { Button, FormField, FormInput, ModalDialog } from "@/components/ui/primitives";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import {
  Bell,
  Cake,
  CheckCircle,
  ChatCircle,
  Eye,
  ImageBroken,
  MagicWand,
  News,
  PencilSimple,
  ShieldCheck,
  Tag,
  ThumbsUp,
  WarningCircle,
  X
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import { updateIntranetSettingsAction, type AdminSettingsFormState } from "@/lib/admin-settings-actions";
import type {
  IntranetPolicyItem,
  IntranetSettings,
  IntranetSettingsData,
  IntranetSettingStatus
} from "@/lib/admin-settings-api";

const initialState: AdminSettingsFormState = {
  ok: false
};

const statusLabels: Record<IntranetSettingStatus, string> = {
  enabled: "Đang bật",
  disabled: "Đang tắt",
  review: "Cần rà soát"
};

const statusIcons: Record<IntranetSettingStatus, Icon> = {
  enabled: CheckCircle,
  disabled: X,
  review: WarningCircle
};

const statusTones: Record<IntranetSettingStatus, BadgeTone> = {
  disabled: "neutral",
  enabled: "success",
  review: "warning"
};

const statusOptions: Array<FormSelectOption & { value: IntranetSettingStatus }> = [
  { value: "enabled", label: "Đang bật" },
  { value: "review", label: "Cần rà soát" },
  { value: "disabled", label: "Đang tắt" }
];

const cultureOptions: FormSelectOption[] = [
  { value: "serious", label: "Nghiêm túc" },
  { value: "engagement", label: "Gắn kết" },
  { value: "open", label: "Mở" }
];

const fallbackSettings: IntranetSettings = {
  brandAssets: [],
  newsfeedPolicies: [],
  privacySettings: [],
  recognitionTemplates: [],
  tags: [],
  reactions: [],
  communicationSettings: [],
  cultureModes: [],
  status: "needs_review"
};

function findPolicyValue(items: IntranetPolicyItem[], id: string) {
  return items.find((item) => item.id === id)?.value ?? "";
}

function findPolicyStatus(items: IntranetPolicyItem[], id: string): IntranetSettingStatus {
  return items.find((item) => item.id === id)?.status ?? "review";
}

function IntranetStatusBadge({ status }: { status: IntranetSettingStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <Badge
      className={`intranet-status intranet-status--${status}`}
      icon={<StatusIcon size={14} weight="duotone" aria-hidden="true" />}
      tone={statusTones[status]}
    >
      {statusLabels[status]}
    </Badge>
  );
}

function IntranetSummary({ settings }: { settings: IntranetSettings }) {
  const summaryItems = [
    { label: "Tài sản thương hiệu", value: settings.brandAssets.length, icon: ImageBroken },
    { label: "Quy tắc bảng tin", value: settings.newsfeedPolicies.length, icon: News },
    { label: "Hashtag", value: settings.tags.length, icon: Tag },
    { label: "Thông báo/chat", value: settings.communicationSettings.length, icon: Bell }
  ];

  return (
    <section className="account-summary-grid" aria-label="Tổng quan mạng nội bộ">
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

function PolicyList({ items, icon: RowIcon }: { items: IntranetPolicyItem[]; icon: Icon }) {
  return (
    <div className="intranet-policy-list">
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
              <IntranetStatusBadge status={item.status} />
            </header>
            <strong>{item.value}</strong>
          </div>
        </article>
      ))}
    </div>
  );
}

function BrandPanel({ settings }: { settings: IntranetSettings }) {
  return (
    <section className="account-panel" aria-labelledby="intranet-brand-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-brand-title">Giao diện & thương hiệu</h2>
          <p>Logo, favicon và tông màu chủ đạo của không gian làm việc số.</p>
        </div>
      </header>
      <div className="intranet-brand-grid">
        {settings.brandAssets.map((asset) => (
          <article key={asset.id}>
            <span className={asset.id === "brand-color" ? "intranet-brand-color" : undefined}>
              {asset.id === "brand-color" ? null : <ImageBroken size={18} weight="duotone" aria-hidden="true" />}
            </span>
            <div>
              <header>
                <h3>{asset.label}</h3>
                <IntranetStatusBadge status={asset.status} />
              </header>
              <strong>{asset.value}</strong>
              <p>{asset.target}</p>
              <small>{asset.recommendation}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function RecognitionPanel({ settings }: { settings: IntranetSettings }) {
  return (
    <section className="account-panel" aria-labelledby="intranet-recognition-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-recognition-title">Vinh danh & sự kiện</h2>
          <p>Mẫu chúc mừng và lịch sự kiện hiển thị trên widget nội bộ.</p>
        </div>
      </header>
      <div className="intranet-template-list">
        {settings.recognitionTemplates.map((template) => (
          <article key={template.id}>
            <span>
              <Cake size={17} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <h3>{template.name}</h3>
              <p>{template.target}</p>
            </div>
            <IntranetStatusBadge status={template.status} />
          </article>
        ))}
      </div>
    </section>
  );
}

function TagsAndReactionsPanel({ settings }: { settings: IntranetSettings }) {
  return (
    <section className="account-panel" aria-labelledby="intranet-tags-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-tags-title">Nhãn & cảm xúc</h2>
          <p>Hashtag phân loại bài viết và bộ icon cảm xúc cho bảng tin.</p>
        </div>
      </header>
      <div className="intranet-tag-list">
        {settings.tags.map((tag) => (
          <article key={tag.id}>
            <span>{tag.label}</span>
            <p>{tag.usage} bài viết</p>
            <IntranetStatusBadge status={tag.status} />
          </article>
        ))}
      </div>
      <div className="intranet-reaction-list">
        {settings.reactions.map((reaction) => (
          <article key={reaction.id}>
            <ThumbsUp size={16} weight="duotone" aria-hidden="true" />
            <div>
              <strong>{reaction.label}</strong>
              <p>{reaction.detail}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function CultureModePanel({ settings }: { settings: IntranetSettings }) {
  return (
    <section className="account-panel" aria-labelledby="intranet-mode-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-mode-title">Chế độ vận hành</h2>
          <p>Preset nhanh cho phong cách truyền thông nội bộ.</p>
        </div>
      </header>
      <div className="intranet-mode-list">
        {settings.cultureModes.map((mode) => (
          <article className={mode.active ? "is-selected" : undefined} key={mode.id}>
            <span>
              <MagicWand size={16} weight="duotone" aria-hidden="true" />
            </span>
            <div>
              <strong>{mode.label}</strong>
              <p>{mode.body}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function AdminTipPanel() {
  return (
    <section className="group-example-panel intranet-tip-panel" aria-label="Mẹo cấu hình mạng nội bộ">
      <span>
        <ShieldCheck size={18} weight="duotone" aria-hidden="true" />
      </span>
      <div>
        <h2>Mẹo cho Admin</h2>
        <p>Nếu doanh nghiệp muốn bảng tin nghiêm túc, hãy bật kiểm duyệt bài viết công khai.</p>
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

function IntranetForm({ onClose, settings }: { onClose: () => void; settings: IntranetSettings }) {
  const router = useRouter();
  const handledSuccessRef = useRef(false);
  const [state, formAction, isPending] = useActionState(updateIntranetSettingsAction, initialState);
  const activeMode = settings.cultureModes.find((mode) => mode.active)?.id ?? "serious";
  const brandColor = settings.brandAssets.find((asset) => asset.id === "brand-color")?.value ?? "#2563EB";

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
        <FormField label="Chế độ vận hành">
          <FormSelect
            ariaLabel="Chọn chế độ vận hành"
            defaultValue={activeMode}
            menuLabel="Chế độ vận hành"
            name="cultureMode"
            options={cultureOptions}
            placeholder="Chọn chế độ"
          />
        </FormField>
        <FormField label="Màu chủ đạo">
          <FormInput name="brandColor" defaultValue={brandColor} />
        </FormField>
        <FormField label="Quyền đăng bài" wide>
          <FormInput name="postPermission" defaultValue={findPolicyValue(settings.newsfeedPolicies, "post-permission")} />
        </FormField>
        <FormField label="Kiểm duyệt bài viết">
          <FormSelect
            ariaLabel="Chọn trạng thái kiểm duyệt bài viết"
            defaultValue={findPolicyStatus(settings.newsfeedPolicies, "post-approval")}
            menuLabel="Trạng thái kiểm duyệt"
            name="postApprovalStatus"
            options={statusOptions}
            placeholder="Chọn trạng thái"
          />
        </FormField>
        <FormField label="Số điện thoại">
          <FormInput name="phoneVisibility" defaultValue={findPolicyValue(settings.privacySettings, "phone-visible")} />
        </FormField>
        <FormField label="Push bài đăng mới">
          <FormInput name="pushNewPost" defaultValue={findPolicyValue(settings.communicationSettings, "push-new-post")} />
        </FormField>
        <FormField label="Tạo nhóm chat công khai">
          <FormInput name="chatGroupPublic" defaultValue={findPolicyValue(settings.communicationSettings, "chat-group-public")} />
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

function IntranetEditDialog({ settings }: { settings: IntranetSettings }) {
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
        Sửa cấu hình
      </Button>
      {isMounted
        ? createPortal(
            <ModalDialog ref={dialogRef} title="Sửa cấu hình mạng nội bộ" onCloseRequest={closeDialog}>
              <IntranetForm settings={settings} onClose={closeDialog} />
            </ModalDialog>,
            document.body
          )
        : null}
    </>
  );
}

export function IntranetSettingsBoard({ data }: { data: IntranetSettingsData }) {
  const settings = data.settings ?? fallbackSettings;

  return (
    <main className="account-access-page intranet-settings-page" aria-label="Cài đặt mạng nội bộ">
      {data.source === "unavailable" ? (
        <section className="account-api-banner" role="status">
          <strong>Chưa kết nối được Intranet API</strong>
          <span>{data.error ?? "Hãy bật API server rồi tải lại trang."}</span>
        </section>
      ) : null}

      <section className="org-page-heading" aria-labelledby="intranet-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="intranet-page-title">Mạng nội bộ</h1>
          <p>Thiết lập thương hiệu, bảng tin, thông tin cá nhân, vinh danh, hashtag, cảm xúc, chat và thông báo nội bộ.</p>
        </div>
        <div className="account-panel-actions">
          <a className="secondary-button" href="/admin/settings#system-settings">
            Quay lại cài đặt
          </a>
          <IntranetEditDialog settings={settings} />
        </div>
      </section>

      <IntranetSummary settings={settings} />

      <section className="account-access-layout" aria-label="Thiết lập mạng nội bộ">
        <div className="account-access-main">
          <BrandPanel settings={settings} />
          <section className="account-panel" aria-labelledby="intranet-newsfeed-title">
            <header className="account-panel-header">
              <div>
                <h2 id="intranet-newsfeed-title">Bảng tin</h2>
                <p>Quyền đăng bài, kiểm duyệt, tương tác và ghim thông báo quan trọng.</p>
              </div>
            </header>
            <PolicyList icon={News} items={settings.newsfeedPolicies} />
          </section>
          <RecognitionPanel settings={settings} />
        </div>

        <aside className="account-access-side" aria-label="Cài đặt hiển thị và tương tác">
          <CultureModePanel settings={settings} />
          <section className="account-panel" aria-labelledby="intranet-privacy-title">
            <header className="account-panel-header">
              <div>
                <h2 id="intranet-privacy-title">Hiển thị thông tin cá nhân</h2>
                <p>Sinh nhật, số điện thoại, email và định danh liên hệ nội bộ.</p>
              </div>
            </header>
            <PolicyList icon={Eye} items={settings.privacySettings} />
          </section>
          <TagsAndReactionsPanel settings={settings} />
          <section className="account-panel" aria-labelledby="intranet-communication-title">
            <header className="account-panel-header">
              <div>
                <h2 id="intranet-communication-title">Chat & thông báo</h2>
                <p>Push notification và quyền tạo nhóm chat công khai/riêng tư.</p>
              </div>
            </header>
            <PolicyList icon={ChatCircle} items={settings.communicationSettings} />
          </section>
          <AdminTipPanel />
        </aside>
      </section>
    </main>
  );
}
