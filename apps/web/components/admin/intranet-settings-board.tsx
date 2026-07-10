import {
  Bell,
  Cake,
  CheckCircle,
  ChatCircle,
  Eye,
  ImageBroken,
  MagicWand,
  Megaphone,
  News,
  ShieldCheck,
  Tag,
  ThumbsUp,
  UploadSimple,
  WarningCircle,
  X
} from "@/lib/icons";
import type { Icon } from "@/lib/icons";
import {
  intranetBrandAssets,
  intranetCommunicationSettings,
  intranetNewsfeedPolicies,
  intranetPrivacySettings,
  intranetReactions,
  intranetRecognitionTemplates,
  intranetTags,
  type IntranetPolicyItem,
  type IntranetSettingStatus
} from "@/lib/mock-data";

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

function IntranetStatusBadge({ status }: { status: IntranetSettingStatus }) {
  const StatusIcon = statusIcons[status];

  return (
    <span className={`intranet-status intranet-status--${status}`}>
      <StatusIcon size={14} weight="duotone" aria-hidden="true" />
      {statusLabels[status]}
    </span>
  );
}

function IntranetSummary() {
  const summaryItems = [
    { label: "Tài sản thương hiệu", value: intranetBrandAssets.length, icon: ImageBroken },
    { label: "Quy tắc bảng tin", value: intranetNewsfeedPolicies.length, icon: News },
    { label: "Hashtag", value: intranetTags.length, icon: Tag },
    { label: "Thông báo/chat", value: intranetCommunicationSettings.length, icon: Bell }
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

function PolicyList({
  items,
  icon: RowIcon
}: {
  items: IntranetPolicyItem[];
  icon: Icon;
}) {
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

function BrandPanel() {
  return (
    <section className="account-panel" aria-labelledby="intranet-brand-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-brand-title">Giao diện & thương hiệu</h2>
          <p>Logo, favicon và tông màu chủ đạo của không gian làm việc số.</p>
        </div>
        <button className="primary-button" type="button">
          <UploadSimple size={16} weight="duotone" aria-hidden="true" />
          Tải logo
        </button>
      </header>

      <div className="intranet-brand-grid">
        {intranetBrandAssets.map((asset) => (
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

function NewsfeedPanel() {
  return (
    <section className="account-panel" aria-labelledby="intranet-newsfeed-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-newsfeed-title">Bảng tin</h2>
          <p>Quyền đăng bài, kiểm duyệt, tương tác và ghim thông báo quan trọng.</p>
        </div>
      </header>

      <PolicyList icon={News} items={intranetNewsfeedPolicies} />
    </section>
  );
}

function PrivacyPanel() {
  return (
    <section className="account-panel" aria-labelledby="intranet-privacy-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-privacy-title">Hiển thị thông tin cá nhân</h2>
          <p>Sinh nhật, số điện thoại, email và định danh liên hệ nội bộ.</p>
        </div>
      </header>

      <PolicyList icon={Eye} items={intranetPrivacySettings} />
    </section>
  );
}

function RecognitionPanel() {
  return (
    <section className="account-panel" aria-labelledby="intranet-recognition-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-recognition-title">Vinh danh & sự kiện</h2>
          <p>Mẫu chúc mừng và lịch sự kiện hiển thị trên widget nội bộ.</p>
        </div>
      </header>

      <div className="intranet-template-list">
        {intranetRecognitionTemplates.map((template) => (
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

function TagsAndReactionsPanel() {
  return (
    <section className="account-panel" aria-labelledby="intranet-tags-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-tags-title">Nhãn & cảm xúc</h2>
          <p>Hashtag phân loại bài viết và bộ icon cảm xúc cho bảng tin.</p>
        </div>
      </header>

      <div className="intranet-tag-list">
        {intranetTags.map((tag) => (
          <article key={tag.id}>
            <span>{tag.label}</span>
            <p>{tag.usage} bài viết</p>
            <IntranetStatusBadge status={tag.status} />
          </article>
        ))}
      </div>

      <div className="intranet-reaction-list">
        {intranetReactions.map((reaction) => (
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

function CommunicationPanel() {
  return (
    <section className="account-panel" aria-labelledby="intranet-communication-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-communication-title">Chat & thông báo</h2>
          <p>Push notification và quyền tạo nhóm chat công khai/riêng tư.</p>
        </div>
      </header>

      <PolicyList icon={ChatCircle} items={intranetCommunicationSettings} />
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
        <p>Nếu doanh nghiệp muốn bảng tin nghiêm túc, hãy tắt đăng bài tự do và chỉ cho Ban lãnh đạo, HR hoặc Internal Comms đăng thông báo chính sách mới.</p>
      </div>
    </section>
  );
}

function CultureModePanel() {
  const modes = [
    { label: "Nghiêm túc", body: "Bảng tin dùng cho chính sách và thông báo lãnh đạo.", active: true },
    { label: "Gắn kết", body: "Cho phép sinh nhật, vinh danh và bài viết phòng ban.", active: false },
    { label: "Mở", body: "Nhân viên tự do đăng bài và tương tác toàn công ty.", active: false }
  ];

  return (
    <section className="account-panel" aria-labelledby="intranet-mode-title">
      <header className="account-panel-header">
        <div>
          <h2 id="intranet-mode-title">Chế độ vận hành</h2>
          <p>Preset nhanh cho phong cách truyền thông nội bộ.</p>
        </div>
      </header>

      <div className="intranet-mode-list">
        {modes.map((mode) => (
          <article className={mode.active ? "is-selected" : undefined} key={mode.label}>
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

export function IntranetSettingsBoard() {
  return (
    <main className="account-access-page intranet-settings-page" aria-label="Cài đặt mạng nội bộ">
      <section className="org-page-heading" aria-labelledby="intranet-page-title">
        <div>
          <span>Cài đặt hệ thống</span>
          <h1 id="intranet-page-title">Mạng nội bộ</h1>
          <p>Thiết lập thương hiệu, bảng tin, thông tin cá nhân, vinh danh, hashtag, cảm xúc, chat và thông báo nội bộ.</p>
        </div>
        <a className="secondary-button" href="/admin/settings#system-settings">
          Quay lại cài đặt
        </a>
      </section>

      <IntranetSummary />

      <section className="account-access-layout" aria-label="Thiết lập mạng nội bộ">
        <div className="account-access-main">
          <BrandPanel />
          <NewsfeedPanel />
          <RecognitionPanel />
        </div>

        <aside className="account-access-side" aria-label="Cài đặt hiển thị và tương tác">
          <CultureModePanel />
          <PrivacyPanel />
          <TagsAndReactionsPanel />
          <CommunicationPanel />
          <AdminTipPanel />
        </aside>
      </section>
    </main>
  );
}
