import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AdminSettingStatus, Prisma } from "@prisma/client";
import * as nodemailer from "nodemailer";
import { PrismaService } from "../../common/prisma/prisma.service";
import { EncryptedSettingSecret, SettingsSecretService } from "../../common/settings-secret.service";
import {
  adminOperationEvents,
  moduleSettingGroups,
  operationSettingItems,
  systemSettingItems
} from "../../common/mock-data";
import { KeycloakAdminService } from "../auth/keycloak-admin.service";
import {
  TestSmtpSettingsDto,
  UpdateCompanyInfoDto,
  UpdateIntranetSettingsDto,
  UpdateModuleConfigDto,
  UpdateSmtpSettingsDto
} from "./admin-settings.dto";

type SmtpSecurity = "none" | "starttls" | "ssl";
type SmtpTestStatus = "sent" | "failed" | "not_tested";
type SmtpSyncStatus = "synced" | "failed" | "not_synced";
type CompanyInfoStatus = "complete" | "review" | "missing";
type IntranetSettingStatus = "enabled" | "disabled" | "review";

type AdminSettingItem = {
  id: string;
  tier: "system" | "module" | "operations";
  category: string;
  title: string;
  summary: string;
  owner: string;
  status: AdminSettingStatus;
  href?: string;
  controls: string[];
};

type AdminModuleSettingGroup = {
  id: string;
  module: "HRM" | "WORK" | "CRM";
  summary: string;
  status: AdminSettingStatus;
  settings: AdminSettingItem[];
};

type AuditLogWithActor = Prisma.AuditLogGetPayload<{
  include: {
    employee: {
      select: {
        code: true;
        fullName: true;
      };
    };
  };
}>;

type AuditDisplayMaps = {
  adminSettings: Map<string, string>;
  deviceAuthRequests: Map<string, string>;
  employees: Map<string, string>;
  permissionGroups: Map<string, string>;
  userAccounts: Map<string, string>;
};

type CompanyInfoItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: CompanyInfoStatus;
};

type CompanyOffice = {
  id: string;
  name: string;
  type: "headquarters" | "office";
  address: string;
  note: string;
};

type CompanyBankAccount = {
  id: string;
  accountNumber: string;
  bankName: string;
  branch: string;
  owner: string;
  isDefault: boolean;
};

type CompanyLegalAsset = {
  id: string;
  name: string;
  fileName: string;
  usage: string;
  status: CompanyInfoStatus;
};

type CompanyInfoPayload = {
  identityInfo: CompanyInfoItem[];
  contactInfo: CompanyInfoItem[];
  offices: CompanyOffice[];
  legalRepresentative: CompanyInfoItem[];
  bankAccounts: CompanyBankAccount[];
  generalConfig: CompanyInfoItem[];
  legalAssets: CompanyLegalAsset[];
};

type IntranetBrandAsset = {
  id: string;
  label: string;
  target: string;
  value: string;
  recommendation: string;
  status: IntranetSettingStatus;
};

type IntranetPolicyItem = {
  id: string;
  label: string;
  value: string;
  detail: string;
  status: IntranetSettingStatus;
};

type IntranetTemplateItem = {
  id: string;
  name: string;
  target: string;
  status: IntranetSettingStatus;
};

type IntranetTagItem = {
  id: string;
  label: string;
  usage: number;
  status: IntranetSettingStatus;
};

type IntranetCultureMode = {
  id: "serious" | "engagement" | "open";
  label: string;
  body: string;
  active: boolean;
};

type IntranetSettingsPayload = {
  brandAssets: IntranetBrandAsset[];
  newsfeedPolicies: IntranetPolicyItem[];
  privacySettings: IntranetPolicyItem[];
  recognitionTemplates: IntranetTemplateItem[];
  tags: IntranetTagItem[];
  reactions: IntranetPolicyItem[];
  communicationSettings: IntranetPolicyItem[];
  cultureModes: IntranetCultureMode[];
};

type ModuleConfigItem = {
  id: string;
  module: "HRM" | "WORK" | "CRM";
  enabled: boolean;
  enabledSettingIds: string[];
};

type ModuleConfigPayload = {
  modules: ModuleConfigItem[];
};

type SmtpSettingsPayload = {
  enabled: boolean;
  provider: string;
  host: string;
  port: number;
  security: SmtpSecurity;
  username: string;
  password?: string;
  fromEmail: string;
  fromName: string;
  replyTo?: string;
  dailyLimit: number;
  testRecipient: string;
  lastTestAt?: string;
  lastTestStatus: SmtpTestStatus;
  lastTestMessage?: string;
  syncedToKeycloakAt?: string;
  keycloakSyncStatus: SmtpSyncStatus;
  keycloakSyncMessage?: string;
  passwordSecret?: EncryptedSettingSecret;
};

const smtpSettingKey = "smtp";
const companyInfoSettingKey = "company-info";
const intranetSettingKey = "intranet-branding";
const moduleConfigSettingKey = "module-config";

const defaultSmtpSettings: SmtpSettingsPayload = {
  enabled: false,
  provider: "Microsoft 365",
  host: "smtp.office365.com",
  port: 587,
  security: "starttls",
  username: "",
  fromEmail: "no-reply@helios.vn",
  fromName: "Helios Office",
  dailyLimit: 1500,
  testRecipient: "admin@helios.vn",
  lastTestStatus: "not_tested",
  keycloakSyncStatus: "not_synced"
};

const defaultCompanyInfo: CompanyInfoPayload = {
  identityInfo: [
    {
      id: "company-name",
      label: "Tên doanh nghiệp",
      value: "Công ty Cổ phần Helios Office",
      detail: "Tên đầy đủ theo giấy phép kinh doanh, dùng trên hợp đồng và hóa đơn.",
      status: "complete"
    },
    {
      id: "company-short-name",
      label: "Tên viết tắt",
      value: "Helios Office",
      detail: "Tên ngắn dùng trong thông báo nội bộ và tiêu đề nhanh.",
      status: "complete"
    },
    {
      id: "tax-code",
      label: "Mã số thuế",
      value: "0109998887",
      detail: "Dùng cho hóa đơn, kế toán và tích hợp E-invoice.",
      status: "complete"
    },
    {
      id: "website",
      label: "Website",
      value: "https://helios.vn",
      detail: "Trang web chính thức hiển thị trên mẫu in và footer.",
      status: "complete"
    }
  ],
  contactInfo: [
    {
      id: "hotline",
      label: "Hotline",
      value: "024 7300 6868",
      detail: "Số tổng đài chính thức trên chứng từ và footer.",
      status: "complete"
    },
    {
      id: "email",
      label: "Email liên hệ",
      value: "info@helios.vn",
      detail: "Email chung cho khách hàng và đối tác.",
      status: "complete"
    },
    {
      id: "head-office",
      label: "Địa chỉ trụ sở",
      value: "Tầng 8, tòa Helios, Hà Nội",
      detail: "Địa chỉ đăng ký kinh doanh chính thức.",
      status: "review"
    }
  ],
  offices: [
    {
      id: "office-hq",
      name: "Trụ sở Hà Nội",
      type: "headquarters",
      address: "Tầng 8, tòa Helios, Hà Nội",
      note: "Địa chỉ pháp lý và nhận thư chính thức."
    },
    {
      id: "office-hcm",
      name: "Văn phòng Hồ Chí Minh",
      type: "office",
      address: "Quận 1, TP.HCM",
      note: "Địa chỉ giao dịch và làm việc miền Nam."
    }
  ],
  legalRepresentative: [
    {
      id: "representative-name",
      label: "Người đại diện",
      value: "Nguyễn Minh Hoàng",
      detail: "Tự động điền vào hợp đồng lao động và hợp đồng kinh tế.",
      status: "complete"
    },
    {
      id: "representative-title",
      label: "Chức vụ",
      value: "Tổng giám đốc",
      detail: "Chức danh pháp lý của người đại diện.",
      status: "complete"
    }
  ],
  bankAccounts: [
    {
      id: "bank-vcb",
      accountNumber: "1028886688",
      bankName: "Vietcombank",
      branch: "Sở giao dịch Hà Nội",
      owner: "Công ty Cổ phần Helios Office",
      isDefault: true
    }
  ],
  generalConfig: [
    {
      id: "fiscal-year",
      label: "Ngày bắt đầu tài khóa",
      value: "01/01",
      detail: "Tháng bắt đầu năm tài chính của doanh nghiệp.",
      status: "complete"
    },
    {
      id: "industry",
      label: "Lĩnh vực hoạt động",
      value: "Phần mềm quản trị doanh nghiệp",
      detail: "Dùng để tối ưu mẫu báo cáo và mẫu chứng từ.",
      status: "complete"
    },
    {
      id: "template-sync",
      label: "Đồng bộ mẫu in",
      value: "Tự động",
      detail: "Báo giá, hợp đồng và hóa đơn dùng biến dữ liệu mới nhất.",
      status: "complete"
    }
  ],
  legalAssets: [
    {
      id: "company-seal",
      name: "Con dấu công ty",
      fileName: "helios-company-seal.png",
      usage: "Đóng dấu hợp đồng điện tử và văn bản phê duyệt.",
      status: "complete"
    }
  ]
};

const defaultIntranetSettings: IntranetSettingsPayload = {
  brandAssets: [
    {
      id: "brand-logo-web",
      label: "Logo công ty",
      target: "Header web và mẫu in ấn",
      value: "helios-logo-primary.svg",
      recommendation: "SVG/PNG nền trong suốt, ngang 160x40px",
      status: "enabled"
    },
    {
      id: "brand-color",
      label: "Màu chủ đạo",
      target: "Button, tab, trạng thái nổi bật",
      value: "#2563EB",
      recommendation: "Đảm bảo tương phản với nền trắng",
      status: "review"
    }
  ],
  newsfeedPolicies: [
    {
      id: "post-permission",
      label: "Quyền đăng bài",
      value: "Ban giám đốc, Internal Comms, HR",
      detail: "Nhân viên thường chỉ được đăng vào nhóm phòng ban.",
      status: "review"
    },
    {
      id: "post-approval",
      label: "Phê duyệt bài viết",
      value: "Bật kiểm duyệt",
      detail: "Bài đăng công khai cần Admin duyệt trước khi hiển thị.",
      status: "enabled"
    }
  ],
  privacySettings: [
    {
      id: "birthday-display",
      label: "Hiển thị sinh nhật",
      value: "Chỉ ngày/tháng",
      detail: "Không hiển thị năm sinh để bảo mật tuổi.",
      status: "enabled"
    },
    {
      id: "phone-visible",
      label: "Số điện thoại",
      value: "Ẩn với nhân viên thường",
      detail: "Quản lý và HR vẫn thấy thông tin liên hệ.",
      status: "review"
    }
  ],
  recognitionTemplates: [
    {
      id: "template-employee-award",
      name: "Nhân viên xuất sắc",
      target: "Bảng tin và widget vinh danh",
      status: "enabled"
    },
    {
      id: "template-birthday",
      name: "Chúc mừng sinh nhật",
      target: "Newsfeed tự động",
      status: "enabled"
    }
  ],
  tags: [
    { id: "tag-policy", label: "#chinhsach", usage: 18, status: "enabled" },
    { id: "tag-culture", label: "#vanhoa", usage: 32, status: "enabled" },
    { id: "tag-urgent", label: "#khancap", usage: 5, status: "review" }
  ],
  reactions: [
    {
      id: "reaction-like",
      label: "Like",
      value: "Bật",
      detail: "Cảm xúc mặc định cho bài viết.",
      status: "enabled"
    },
    {
      id: "reaction-love",
      label: "Love",
      value: "Bật",
      detail: "Dùng cho vinh danh, sinh nhật, chào mừng.",
      status: "enabled"
    }
  ],
  communicationSettings: [
    {
      id: "push-new-post",
      label: "Push bài đăng mới",
      value: "Chỉ bài ghim hoặc bài quan trọng",
      detail: "Giảm nhiễu thông báo trên điện thoại.",
      status: "enabled"
    },
    {
      id: "chat-group-public",
      label: "Tạo nhóm chat công khai",
      value: "Quản lý trở lên",
      detail: "Nhân viên thường chỉ tạo nhóm riêng tư.",
      status: "review"
    }
  ],
  cultureModes: [
    {
      id: "serious",
      label: "Nghiêm túc",
      body: "Bảng tin dùng cho chính sách và thông báo lãnh đạo.",
      active: true
    },
    {
      id: "engagement",
      label: "Gắn kết",
      body: "Cho phép sinh nhật, vinh danh và bài viết phòng ban.",
      active: false
    },
    {
      id: "open",
      label: "Mở",
      body: "Nhân viên tự do đăng bài và tương tác toàn công ty.",
      active: false
    }
  ]
};

const defaultModuleConfig: ModuleConfigPayload = {
  modules: moduleSettingGroups.map((group) => ({
    id: group.id,
    module: group.module as ModuleConfigItem["module"],
    enabled: group.status !== "planned",
    enabledSettingIds: group.settings.filter((setting) => setting.status !== "planned").map((setting) => setting.id)
  }))
};

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
    private readonly settingsSecrets: SettingsSecretService
  ) {}

  async findOverview() {
    const snapshot = await this.buildAdminSettingsSnapshot();

    return snapshot.overview;
  }

  async findAll() {
    return this.buildAdminSettingsSnapshot();
  }

  async findSystemSettings() {
    const snapshot = await this.buildAdminSettingsSnapshot();

    return snapshot.system;
  }

  async findModuleSettings() {
    const snapshot = await this.buildAdminSettingsSnapshot();

    return snapshot.modules;
  }

  async findOperationSettings() {
    const snapshot = await this.buildAdminSettingsSnapshot();

    return snapshot.operations;
  }

  async findEvents() {
    const auditLogs = await this.prisma.auditLog.findMany({
      include: {
        employee: {
          select: {
            code: true,
            fullName: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 200
    });

    if (auditLogs.length === 0) {
      return adminOperationEvents;
    }

    const displayMaps = await this.buildAuditDisplayMaps(auditLogs);

    return auditLogs.map((log) => ({
      id: log.id,
      time: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }).format(log.createdAt),
      actor: this.resolveAuditActor(log, displayMaps),
      action: log.action,
      target: this.resolveAuditTarget(log, displayMaps),
      severity: this.resolveAuditSeverity(log.action)
    }));
  }

  private async buildAuditDisplayMaps(auditLogs: AuditLogWithActor[]): Promise<AuditDisplayMaps> {
    const idsByType = auditLogs.reduce(
      (accumulator, log) => {
        accumulator[log.entityType] ??= new Set<string>();
        accumulator[log.entityType].add(log.entityId);
        return accumulator;
      },
      {} as Record<string, Set<string>>
    );

    const userAccountIds = [...(idsByType.UserAccount ?? new Set<string>())];
    const employeeIds = [...(idsByType.Employee ?? new Set<string>())];
    const permissionGroupIds = [...(idsByType.PermissionGroup ?? new Set<string>())];
    const adminSettingKeys = [...(idsByType.AdminSetting ?? new Set<string>())];
    const deviceAuthRequestIds = [...(idsByType.DeviceAuthRequest ?? new Set<string>())];

    const [userAccounts, employees, permissionGroups, adminSettings, deviceAuthRequests] = await Promise.all([
      userAccountIds.length > 0
        ? this.prisma.userAccount.findMany({
            where: { id: { in: userAccountIds } },
            select: {
              id: true,
              displayName: true,
              email: true,
              employee: {
                select: {
                  code: true,
                  fullName: true
                }
              }
            }
          })
        : [],
      employeeIds.length > 0
        ? this.prisma.employee.findMany({
            where: { id: { in: employeeIds } },
            select: {
              id: true,
              code: true,
              fullName: true
            }
          })
        : [],
      permissionGroupIds.length > 0
        ? this.prisma.permissionGroup.findMany({
            where: { id: { in: permissionGroupIds } },
            select: {
              id: true,
              name: true
            }
          })
        : [],
      adminSettingKeys.length > 0
        ? this.prisma.adminSetting.findMany({
            where: { key: { in: adminSettingKeys } },
            select: {
              key: true,
              title: true
            }
          })
        : [],
      deviceAuthRequestIds.length > 0
        ? this.prisma.deviceAuthRequest.findMany({
            where: { id: { in: deviceAuthRequestIds } },
            select: {
              id: true,
              deviceName: true,
              employeeName: true
            }
          })
        : []
    ]);

    return {
      adminSettings: new Map(adminSettings.map((setting) => [setting.key, setting.title])),
      deviceAuthRequests: new Map(
        deviceAuthRequests.map((request) => [request.id, `${request.employeeName} - ${request.deviceName}`])
      ),
      employees: new Map(employees.map((employee) => [employee.id, `${employee.fullName} (${employee.code})`])),
      permissionGroups: new Map(permissionGroups.map((group) => [group.id, group.name])),
      userAccounts: new Map(
        userAccounts.map((account) => [
          account.id,
          account.employee
            ? `${account.employee.fullName} (${account.employee.code})`
            : `${account.displayName} (${account.email})`
        ])
      )
    };
  }

  private resolveAuditActor(log: AuditLogWithActor, displayMaps: AuditDisplayMaps) {
    if (log.employee) {
      return `${log.employee.fullName} (${log.employee.code})`;
    }

    if (log.actorId) {
      return displayMaps.employees.get(log.actorId) ?? "Người thao tác không xác định";
    }

    return "Hệ thống";
  }

  private resolveAuditTarget(log: AuditLogWithActor, displayMaps: AuditDisplayMaps) {
    if (log.entityType === "UserAccount") {
      return (
        displayMaps.userAccounts.get(log.entityId) ??
        this.resolveUserAccountTargetFromPayload(log) ??
        "Tài khoản chưa xác định"
      );
    }

    if (log.entityType === "PermissionGroup") {
      return (
        displayMaps.permissionGroups.get(log.entityId) ??
        this.extractStringFromAuditPayload(log, "name") ??
        "Nhóm quyền chưa xác định"
      );
    }

    if (log.entityType === "PermissionDefinition") {
      const label = this.extractStringFromAuditPayload(log, "label");

      return label ? `${label} (${log.entityId})` : `Quyền ${log.entityId}`;
    }

    if (log.entityType === "Employee") {
      return (
        displayMaps.employees.get(log.entityId) ??
        this.resolveEmployeeTargetFromPayload(log) ??
        "Nhân sự chưa xác định"
      );
    }

    if (log.entityType === "Department") {
      return this.extractStringFromAuditPayload(log, "name") ?? "Phòng ban chưa xác định";
    }

    if (log.entityType === "JobPosition") {
      return this.extractStringFromAuditPayload(log, "name") ?? "Vị trí chưa xác định";
    }

    if (log.entityType === "JobTitle") {
      return this.extractStringFromAuditPayload(log, "name") ?? "Chức danh chưa xác định";
    }

    if (log.entityType === "AdminSetting") {
      return displayMaps.adminSettings.get(log.entityId) ?? this.resolveAdminSettingTarget(log.entityId);
    }

    if (log.entityType === "DeviceAuthRequest") {
      return displayMaps.deviceAuthRequests.get(log.entityId) ?? "Thiết bị chưa xác định";
    }

    if (log.entityType === "DeviceAuthPolicy") {
      return "Chính sách xác thực thiết bị";
    }

    return this.extractStringFromAuditPayload(log, "name") ?? `${log.entityType} ${log.entityId}`;
  }

  private resolveUserAccountTargetFromPayload(log: AuditLogWithActor) {
    const displayName = this.extractStringFromAuditPayload(log, "displayName");
    const email = this.extractStringFromAuditPayload(log, "email");

    if (displayName && email) {
      return `${displayName} (${email})`;
    }

    if (email) {
      return `Tài khoản ${email}`;
    }

    return displayName;
  }

  private resolveEmployeeTargetFromPayload(log: AuditLogWithActor) {
    const fullName = this.extractStringFromAuditPayload(log, "fullName");
    const code = this.extractStringFromAuditPayload(log, "code");

    if (fullName && code) {
      return `${fullName} (${code})`;
    }

    return fullName ?? code;
  }

  private resolveAdminSettingTarget(entityId: string) {
    const labels: Record<string, string> = {
      [companyInfoSettingKey]: "Thông tin doanh nghiệp",
      [intranetSettingKey]: "Mạng nội bộ",
      [moduleConfigSettingKey]: "Cấu hình phân hệ",
      [smtpSettingKey]: "SMTP"
    };

    return labels[entityId] ?? entityId;
  }

  private extractStringFromAuditPayload(log: AuditLogWithActor, key: string) {
    const afterValue = this.asAuditRecord(log.afterValue);
    const beforeValue = this.asAuditRecord(log.beforeValue);
    const value = afterValue?.[key] ?? beforeValue?.[key];

    return typeof value === "string" && value.trim().length > 0 ? value : null;
  }

  private asAuditRecord(value: Prisma.JsonValue | null | undefined): Record<string, unknown> | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }

    return value as Record<string, unknown>;
  }

  async findOne(id: string) {
    const snapshot = await this.buildAdminSettingsSnapshot();
    const allItems = [
      ...snapshot.system,
      ...snapshot.modules.flatMap((group) => group.settings),
      ...snapshot.operations
    ];
    const setting = allItems.find((item) => item.id === id);

    if (!setting) {
      throw new NotFoundException(`Admin setting ${id} was not found`);
    }

    return setting;
  }

  async getCompanyInfo() {
    const setting = await this.ensureCompanyInfoSetting();

    return {
      ...this.readCompanyInfoPayload(setting.payload),
      status: setting.status
    };
  }

  async updateCompanyInfo(dto: UpdateCompanyInfoDto, actorId?: string) {
    const before = await this.ensureCompanyInfoSetting();
    const beforePayload = this.readCompanyInfoPayload(before.payload);
    const nextPayload = this.applyCompanyInfoDto(beforePayload, dto);
    const status = this.resolveCompanyInfoStatus(nextPayload);
    const setting = await this.prisma.adminSetting.update({
      where: { key: companyInfoSettingKey },
      data: {
        status,
        payload: this.toJson(nextPayload)
      }
    });

    await this.writeAudit("admin_setting.company_info.update", companyInfoSettingKey, beforePayload, nextPayload, actorId);

    return {
      ...nextPayload,
      status: setting.status
    };
  }

  async getIntranetSettings() {
    const setting = await this.ensureIntranetSetting();

    return {
      ...this.readIntranetPayload(setting.payload),
      status: setting.status
    };
  }

  async updateIntranetSettings(dto: UpdateIntranetSettingsDto, actorId?: string) {
    const before = await this.ensureIntranetSetting();
    const beforePayload = this.readIntranetPayload(before.payload);
    const nextPayload = this.applyIntranetDto(beforePayload, dto);
    const status = this.resolveIntranetStatus(nextPayload);
    const setting = await this.prisma.adminSetting.update({
      where: { key: intranetSettingKey },
      data: {
        status,
        payload: this.toJson(nextPayload)
      }
    });

    await this.writeAudit("admin_setting.intranet.update", intranetSettingKey, beforePayload, nextPayload, actorId);

    return {
      ...nextPayload,
      status: setting.status
    };
  }

  async getModuleConfig() {
    const setting = await this.ensureModuleConfigSetting();

    return {
      ...this.readModuleConfigPayload(setting.payload),
      status: setting.status
    };
  }

  async updateModuleConfig(dto: UpdateModuleConfigDto, actorId?: string) {
    const before = await this.ensureModuleConfigSetting();
    const beforePayload = this.readModuleConfigPayload(before.payload);
    const existingModule = beforePayload.modules.find((moduleConfig) => moduleConfig.id === dto.moduleId);

    if (!existingModule) {
      throw new NotFoundException(`Module config ${dto.moduleId} was not found`);
    }

    const nextPayload: ModuleConfigPayload = {
      modules: beforePayload.modules.map((moduleConfig) =>
        moduleConfig.id === dto.moduleId
          ? {
              ...moduleConfig,
              enabled: dto.enabled,
              enabledSettingIds: dto.enabledSettingIds ?? moduleConfig.enabledSettingIds
            }
          : moduleConfig
      )
    };
    const status = this.resolveModuleConfigStatus(nextPayload);
    const setting = await this.prisma.adminSetting.update({
      where: { key: moduleConfigSettingKey },
      data: {
        status,
        payload: this.toJson(nextPayload)
      }
    });

    await this.writeAudit(
      "admin_setting.module_config.update",
      dto.moduleId,
      existingModule,
      nextPayload.modules.find((moduleConfig) => moduleConfig.id === dto.moduleId),
      actorId
    );

    return {
      ...nextPayload,
      status: setting.status
    };
  }

  async getSmtpSettings() {
    const setting = await this.ensureSmtpSetting();
    const payload = this.readSmtpPayload(setting.payload);

    await this.encryptLegacySmtpSecretIfNeeded(setting, payload);

    return this.resolveSmtpResponse(payload, setting.status);
  }

  async updateSmtpSettings(dto: UpdateSmtpSettingsDto, actorId?: string) {
    const before = await this.ensureSmtpSetting();
    const beforePayload = this.readSmtpPayload(before.payload);
    const nextPayload: SmtpSettingsPayload = {
      ...beforePayload,
      ...this.normalizeSmtpDto(dto),
      password: this.resolveNextPassword(beforePayload.password, dto.password)
    };

    const syncResult = await this.syncKeycloakSmtpIfReady(nextPayload);
    const payloadWithSync = {
      ...nextPayload,
      ...syncResult
    };
    const status = this.resolveSmtpStatus(payloadWithSync);
    const setting = await this.prisma.adminSetting.update({
      where: { key: smtpSettingKey },
      data: {
        status,
        payload: this.toJson(this.serializeSmtpPayload(payloadWithSync))
      }
    });

    await this.writeAudit(
      "admin_setting.smtp.update",
      smtpSettingKey,
      this.sanitizeSmtpPayload(beforePayload),
      this.sanitizeSmtpPayload(payloadWithSync),
      actorId
    );

    return this.resolveSmtpResponse(payloadWithSync, setting.status);
  }

  async testSmtpSettings(dto: TestSmtpSettingsDto, actorId?: string) {
    const setting = await this.ensureSmtpSetting();
    const payload = this.readSmtpPayload(setting.payload);
    const recipient = dto.recipient ?? payload.testRecipient;

    if (!recipient) {
      throw new BadRequestException("Test recipient is required");
    }

    const missingFields = this.getMissingRequiredSmtpFields(payload);

    if (missingFields.length > 0) {
      throw new BadRequestException(`SMTP settings are incomplete: ${missingFields.join(", ")}`);
    }

    const testedAt = new Date().toISOString();

    try {
      const transporter = nodemailer.createTransport({
        host: payload.host,
        port: payload.port,
        secure: payload.security === "ssl",
        requireTLS: payload.security === "starttls",
        auth: payload.username
          ? {
              user: payload.username,
              pass: payload.password
            }
          : undefined
      });

      await transporter.verify();
      await transporter.sendMail({
        from: {
          name: payload.fromName,
          address: payload.fromEmail
        },
        replyTo: payload.replyTo || undefined,
        to: recipient,
        subject: "Helios Office SMTP test",
        text: "SMTP cua Helios Office da gui duoc email thu nghiem.",
        html: "<p>SMTP cua <strong>Helios Office</strong> da gui duoc email thu nghiem.</p>"
      });

      const nextPayload: SmtpSettingsPayload = {
        ...payload,
        testRecipient: recipient,
        lastTestAt: testedAt,
        lastTestStatus: "sent",
        lastTestMessage: `Sent to ${recipient}`
      };
      const updated = await this.prisma.adminSetting.update({
        where: { key: smtpSettingKey },
        data: {
          status: this.resolveSmtpStatus(nextPayload),
          payload: this.toJson(this.serializeSmtpPayload(nextPayload))
        }
      });

      await this.writeAudit(
        "admin_setting.smtp.test_sent",
        smtpSettingKey,
        this.sanitizeSmtpPayload(payload),
        this.sanitizeSmtpPayload(nextPayload),
        actorId
      );

      return {
        ok: true,
        message: `Da gui email thu den ${recipient}`,
        settings: this.resolveSmtpResponse(nextPayload, updated.status)
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 300) : "SMTP test failed";
      const nextPayload: SmtpSettingsPayload = {
        ...payload,
        testRecipient: recipient,
        lastTestAt: testedAt,
        lastTestStatus: "failed",
        lastTestMessage: message
      };
      const updated = await this.prisma.adminSetting.update({
        where: { key: smtpSettingKey },
        data: {
          status: AdminSettingStatus.needs_review,
          payload: this.toJson(this.serializeSmtpPayload(nextPayload))
        }
      });

      await this.writeAudit(
        "admin_setting.smtp.test_failed",
        smtpSettingKey,
        this.sanitizeSmtpPayload(payload),
        this.sanitizeSmtpPayload(nextPayload),
        actorId
      );

      return {
        ok: false,
        message,
        settings: this.resolveSmtpResponse(nextPayload, updated.status)
      };
    }
  }

  async isSmtpEmailEnabled() {
    const setting = await this.ensureSmtpSetting();
    const payload = this.readSmtpPayload(setting.payload);

    return payload.enabled && payload.keycloakSyncStatus === "synced" && this.getMissingRequiredSmtpFields(payload).length === 0;
  }

  private async buildAdminSettingsSnapshot() {
    const [storedSettings, activeUsers, events] = await Promise.all([
      this.prisma.adminSetting.findMany(),
      this.prisma.userAccount.count({
        where: { accountStatus: "active" }
      }),
      this.findEvents()
    ]);
    const statusByKey = new Map(storedSettings.map((setting) => [setting.key, setting.status]));
    const moduleConfig = this.readModuleConfigPayload(storedSettings.find((setting) => setting.key === moduleConfigSettingKey)?.payload);
    const mergedSystem = (systemSettingItems as AdminSettingItem[]).map((item) => ({
      ...item,
      status: statusByKey.get(item.id) ?? item.status
    }));
    const mergedOperations = (operationSettingItems as AdminSettingItem[]).map((item) => ({
      ...item,
      status: statusByKey.get(item.id) ?? item.status
    }));
    const mergedModules = this.mergeModuleGroupsWithConfig(moduleSettingGroups as AdminModuleSettingGroup[], moduleConfig);
    const allItems = [
      ...mergedSystem,
      ...mergedModules.flatMap((group) => group.settings),
      ...mergedOperations
    ];

    return {
      overview: {
        totalSettings: allItems.length,
        configured: allItems.filter((item) => item.status === "configured").length,
        needsReview: allItems.filter((item) => item.status === "needs_review").length,
        planned: allItems.filter((item) => item.status === "planned").length,
        systemSettings: mergedSystem.length,
        moduleSettings: mergedModules.reduce((total, group) => total + group.settings.length, 0),
        operationSettings: mergedOperations.length,
        activeUsers
      },
      system: mergedSystem,
      modules: mergedModules,
      operations: mergedOperations,
      events
    };
  }

  private mergeModuleGroupsWithConfig(
    groups: AdminModuleSettingGroup[],
    payload: ModuleConfigPayload
  ): AdminModuleSettingGroup[] {
    return groups.map((group) => {
      const config = payload.modules.find((moduleConfig) => moduleConfig.id === group.id);

      if (!config || !config.enabled) {
        return {
          ...group,
          status: AdminSettingStatus.planned,
          settings: group.settings.map((setting) => ({
            ...setting,
            status: AdminSettingStatus.planned
          }))
        };
      }

      const settings = group.settings.map((setting) => ({
        ...setting,
        status: config.enabledSettingIds.includes(setting.id) ? setting.status : AdminSettingStatus.planned
      }));

      return {
        ...group,
        status: this.resolveGroupStatus(settings),
        settings
      };
    });
  }

  private resolveGroupStatus(settings: AdminSettingItem[]): AdminSettingStatus {
    if (settings.every((setting) => setting.status === "planned")) {
      return AdminSettingStatus.planned;
    }

    if (settings.some((setting) => setting.status === "needs_review")) {
      return AdminSettingStatus.needs_review;
    }

    return AdminSettingStatus.configured;
  }

  private async ensureCompanyInfoSetting() {
    const existing = await this.prisma.adminSetting.findUnique({
      where: { key: companyInfoSettingKey }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.adminSetting.create({
      data: {
        key: companyInfoSettingKey,
        tier: "system",
        category: "Cấu hình Hệ thống chung",
        title: "Thông tin doanh nghiệp",
        summary: "Cập nhật tên công ty, địa chỉ, mã số thuế và thông tin pháp lý.",
        owner: "Finance",
        status: this.resolveCompanyInfoStatus(defaultCompanyInfo),
        controls: ["Tên công ty", "Địa chỉ", "Mã số thuế", "Pháp lý"],
        payload: this.toJson(defaultCompanyInfo)
      }
    });
  }

  private async ensureIntranetSetting() {
    const existing = await this.prisma.adminSetting.findUnique({
      where: { key: intranetSettingKey }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.adminSetting.create({
      data: {
        key: intranetSettingKey,
        tier: "system",
        category: "Cấu hình Hệ thống chung",
        title: "Mạng nội bộ",
        summary: "Thiết lập thương hiệu, bảng tin, quyền hiển thị và thông báo nội bộ.",
        owner: "Internal Comms",
        status: this.resolveIntranetStatus(defaultIntranetSettings),
        controls: ["Logo", "Màu sắc", "Bảng tin", "Thông báo"],
        payload: this.toJson(defaultIntranetSettings)
      }
    });
  }

  private async ensureModuleConfigSetting() {
    const existing = await this.prisma.adminSetting.findUnique({
      where: { key: moduleConfigSettingKey }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.adminSetting.create({
      data: {
        key: moduleConfigSettingKey,
        tier: "module",
        category: "Module Settings",
        title: "Cấu hình phân hệ",
        summary: "Bật/tắt các phân hệ nghiệp vụ và phạm vi cấu hình đang dùng.",
        owner: "System Admin",
        status: this.resolveModuleConfigStatus(defaultModuleConfig),
        controls: ["HRM", "WORK", "CRM"],
        payload: this.toJson(defaultModuleConfig)
      }
    });
  }

  private readCompanyInfoPayload(value: Prisma.JsonValue | null | undefined): CompanyInfoPayload {
    if (!this.isPlainRecord(value)) {
      return defaultCompanyInfo;
    }

    const payload = value as Partial<CompanyInfoPayload>;

    return {
      identityInfo: Array.isArray(payload.identityInfo) ? payload.identityInfo as CompanyInfoItem[] : defaultCompanyInfo.identityInfo,
      contactInfo: Array.isArray(payload.contactInfo) ? payload.contactInfo as CompanyInfoItem[] : defaultCompanyInfo.contactInfo,
      offices: Array.isArray(payload.offices) ? payload.offices as CompanyOffice[] : defaultCompanyInfo.offices,
      legalRepresentative: Array.isArray(payload.legalRepresentative) ? payload.legalRepresentative as CompanyInfoItem[] : defaultCompanyInfo.legalRepresentative,
      bankAccounts: Array.isArray(payload.bankAccounts) ? payload.bankAccounts as CompanyBankAccount[] : defaultCompanyInfo.bankAccounts,
      generalConfig: Array.isArray(payload.generalConfig) ? payload.generalConfig as CompanyInfoItem[] : defaultCompanyInfo.generalConfig,
      legalAssets: Array.isArray(payload.legalAssets) ? payload.legalAssets as CompanyLegalAsset[] : defaultCompanyInfo.legalAssets
    };
  }

  private readIntranetPayload(value: Prisma.JsonValue | null | undefined): IntranetSettingsPayload {
    if (!this.isPlainRecord(value)) {
      return defaultIntranetSettings;
    }

    const payload = value as Partial<IntranetSettingsPayload>;

    return {
      brandAssets: Array.isArray(payload.brandAssets) ? payload.brandAssets as IntranetBrandAsset[] : defaultIntranetSettings.brandAssets,
      newsfeedPolicies: Array.isArray(payload.newsfeedPolicies) ? payload.newsfeedPolicies as IntranetPolicyItem[] : defaultIntranetSettings.newsfeedPolicies,
      privacySettings: Array.isArray(payload.privacySettings) ? payload.privacySettings as IntranetPolicyItem[] : defaultIntranetSettings.privacySettings,
      recognitionTemplates: Array.isArray(payload.recognitionTemplates) ? payload.recognitionTemplates as IntranetTemplateItem[] : defaultIntranetSettings.recognitionTemplates,
      tags: Array.isArray(payload.tags) ? payload.tags as IntranetTagItem[] : defaultIntranetSettings.tags,
      reactions: Array.isArray(payload.reactions) ? payload.reactions as IntranetPolicyItem[] : defaultIntranetSettings.reactions,
      communicationSettings: Array.isArray(payload.communicationSettings) ? payload.communicationSettings as IntranetPolicyItem[] : defaultIntranetSettings.communicationSettings,
      cultureModes: Array.isArray(payload.cultureModes) ? payload.cultureModes as IntranetCultureMode[] : defaultIntranetSettings.cultureModes
    };
  }

  private readModuleConfigPayload(value: Prisma.JsonValue | null | undefined): ModuleConfigPayload {
    if (!this.isPlainRecord(value)) {
      return defaultModuleConfig;
    }

    const payload = value as Partial<ModuleConfigPayload>;

    if (!Array.isArray(payload.modules)) {
      return defaultModuleConfig;
    }

    return {
      modules: defaultModuleConfig.modules.map((defaultModule) => {
        const storedModule = payload.modules?.find((moduleConfig) => this.isPlainRecord(moduleConfig) && moduleConfig.id === defaultModule.id) as Partial<ModuleConfigItem> | undefined;

        return {
          ...defaultModule,
          ...storedModule,
          enabled: storedModule?.enabled === undefined ? defaultModule.enabled : Boolean(storedModule.enabled),
          enabledSettingIds: Array.isArray(storedModule?.enabledSettingIds)
            ? storedModule.enabledSettingIds.filter((id): id is string => typeof id === "string")
            : defaultModule.enabledSettingIds
        };
      })
    };
  }

  private applyCompanyInfoDto(payload: CompanyInfoPayload, dto: UpdateCompanyInfoDto): CompanyInfoPayload {
    const setItemValue = (items: CompanyInfoItem[], id: string, value: string | undefined) =>
      value === undefined
        ? items
        : items.map((item) => item.id === id ? { ...item, value: value.trim(), status: this.resolveCompanyItemStatus(value) } : item);

    return {
      ...payload,
      identityInfo: setItemValue(
        setItemValue(
          setItemValue(
            setItemValue(payload.identityInfo, "company-name", dto.companyName),
            "company-short-name",
            dto.shortName
          ),
          "tax-code",
          dto.taxCode
        ),
        "website",
        dto.website
      ),
      contactInfo: setItemValue(
        setItemValue(
          setItemValue(payload.contactInfo, "hotline", dto.hotline),
          "email",
          dto.email
        ),
        "head-office",
        dto.headOffice
      ),
      legalRepresentative: setItemValue(
        setItemValue(payload.legalRepresentative, "representative-name", dto.representativeName),
        "representative-title",
        dto.representativeTitle
      ),
      generalConfig: setItemValue(
        setItemValue(
          setItemValue(payload.generalConfig, "fiscal-year", dto.fiscalYear),
          "industry",
          dto.industry
        ),
        "template-sync",
        dto.templateSync
      )
    };
  }

  private applyIntranetDto(payload: IntranetSettingsPayload, dto: UpdateIntranetSettingsDto): IntranetSettingsPayload {
    const setPolicyValue = (items: IntranetPolicyItem[], id: string, value: string | undefined, status?: IntranetSettingStatus) =>
      value === undefined && status === undefined
        ? items
        : items.map((item) => item.id === id ? { ...item, value: value?.trim() ?? item.value, status: status ?? item.status } : item);

    return {
      ...payload,
      brandAssets: dto.brandColor === undefined
        ? payload.brandAssets
        : payload.brandAssets.map((asset) =>
            asset.id === "brand-color" ? { ...asset, value: dto.brandColor?.trim() ?? asset.value, status: "enabled" } : asset
          ),
      newsfeedPolicies: setPolicyValue(
        setPolicyValue(payload.newsfeedPolicies, "post-permission", dto.postPermission),
        "post-approval",
        undefined,
        dto.postApprovalStatus
      ),
      privacySettings: setPolicyValue(payload.privacySettings, "phone-visible", dto.phoneVisibility),
      communicationSettings: setPolicyValue(
        setPolicyValue(payload.communicationSettings, "push-new-post", dto.pushNewPost),
        "chat-group-public",
        dto.chatGroupPublic
      ),
      cultureModes: dto.cultureMode === undefined
        ? payload.cultureModes
        : payload.cultureModes.map((mode) => ({
            ...mode,
            active: mode.id === dto.cultureMode
          }))
    };
  }

  private resolveCompanyInfoStatus(payload: CompanyInfoPayload): AdminSettingStatus {
    const items = [
      ...payload.identityInfo,
      ...payload.contactInfo,
      ...payload.legalRepresentative,
      ...payload.generalConfig
    ];

    if (items.some((item) => item.status === "missing")) {
      return AdminSettingStatus.needs_review;
    }

    if (items.some((item) => item.status === "review")) {
      return AdminSettingStatus.needs_review;
    }

    return AdminSettingStatus.configured;
  }

  private resolveCompanyItemStatus(value: string): CompanyInfoStatus {
    return value.trim().length > 0 ? "complete" : "missing";
  }

  private resolveIntranetStatus(payload: IntranetSettingsPayload): AdminSettingStatus {
    const items = [
      ...payload.brandAssets,
      ...payload.newsfeedPolicies,
      ...payload.privacySettings,
      ...payload.recognitionTemplates,
      ...payload.tags,
      ...payload.reactions,
      ...payload.communicationSettings
    ];

    if (items.every((item) => item.status === "disabled")) {
      return AdminSettingStatus.planned;
    }

    if (items.some((item) => item.status === "review")) {
      return AdminSettingStatus.needs_review;
    }

    return AdminSettingStatus.configured;
  }

  private resolveModuleConfigStatus(payload: ModuleConfigPayload): AdminSettingStatus {
    if (payload.modules.every((moduleConfig) => !moduleConfig.enabled)) {
      return AdminSettingStatus.planned;
    }

    if (payload.modules.some((moduleConfig) => moduleConfig.enabled && moduleConfig.enabledSettingIds.length === 0)) {
      return AdminSettingStatus.needs_review;
    }

    return AdminSettingStatus.configured;
  }

  private resolveAuditSeverity(action: string) {
    if (action.includes("failed") || action.includes("closed") || action.includes("archive")) {
      return "critical";
    }

    if (action.includes("update") || action.includes("sync")) {
      return "warning";
    }

    return "info";
  }

  private async ensureSmtpSetting() {
    const existing = await this.prisma.adminSetting.findUnique({
      where: { key: smtpSettingKey }
    });

    if (existing) {
      return existing;
    }

    return this.prisma.adminSetting.create({
      data: {
        key: smtpSettingKey,
        tier: "system",
        category: "Kết nối & Giao tiếp",
        title: "Cấu hình Email SMTP",
        summary: "Cài đặt server email gửi thông báo, phiếu lương, hợp đồng và invite tài khoản.",
        owner: "IT Admin",
        status: "needs_review",
        controls: ["SMTP", "Email gửi đi", "Invite tài khoản", "Gửi thử"],
        payload: this.toJson(defaultSmtpSettings)
      }
    });
  }

  private readSmtpPayload(value: Prisma.JsonValue | null | undefined): SmtpSettingsPayload {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return defaultSmtpSettings;
    }

    const payload = value as Partial<SmtpSettingsPayload>;
    const { password: legacyPassword, passwordSecret: storedPasswordSecret, ...safePayload } = payload;

    return {
      ...defaultSmtpSettings,
      ...safePayload,
      password: this.resolveStoredPassword(legacyPassword, storedPasswordSecret),
      enabled: Boolean(payload.enabled),
      port: Number(payload.port ?? defaultSmtpSettings.port),
      dailyLimit: Number(payload.dailyLimit ?? defaultSmtpSettings.dailyLimit),
      security: this.isSmtpSecurity(payload.security) ? payload.security : defaultSmtpSettings.security,
      lastTestStatus: this.isSmtpTestStatus(payload.lastTestStatus)
        ? payload.lastTestStatus
        : defaultSmtpSettings.lastTestStatus,
      keycloakSyncStatus: this.isSmtpSyncStatus(payload.keycloakSyncStatus)
        ? payload.keycloakSyncStatus
        : defaultSmtpSettings.keycloakSyncStatus
    };
  }

  private async encryptLegacySmtpSecretIfNeeded(
    setting: { key: string; payload: Prisma.JsonValue | null; status: AdminSettingStatus },
    payload: SmtpSettingsPayload
  ) {
    if (!this.hasLegacyPlaintextPassword(setting.payload)) {
      return;
    }

    await this.prisma.adminSetting.update({
      where: { key: setting.key },
      data: {
        payload: this.toJson(this.serializeSmtpPayload(payload))
      }
    });

    await this.writeAudit(
      "admin_setting.smtp.secret_migrated",
      setting.key,
      { passwordSet: true, storage: "plaintext" },
      { passwordSet: true, storage: "encrypted" }
    );
  }

  private hasLegacyPlaintextPassword(value: Prisma.JsonValue | null | undefined) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return false;
    }

    const payload = value as Record<string, unknown>;

    return typeof payload.password === "string" && payload.password.length > 0;
  }

  private normalizeSmtpDto(dto: UpdateSmtpSettingsDto): Partial<SmtpSettingsPayload> {
    const normalized: Partial<SmtpSettingsPayload> = {};

    if (dto.enabled !== undefined) {
      normalized.enabled = dto.enabled;
    }

    if (dto.provider !== undefined) {
      normalized.provider = this.normalizeOptionalString(dto.provider);
    }

    if (dto.host !== undefined) {
      normalized.host = this.normalizeOptionalString(dto.host);
    }

    if (dto.port !== undefined) {
      normalized.port = dto.port;
    }

    if (dto.security !== undefined) {
      normalized.security = dto.security;
    }

    if (dto.username !== undefined) {
      normalized.username = this.normalizeOptionalString(dto.username);
    }

    if (dto.fromEmail !== undefined) {
      normalized.fromEmail = this.normalizeOptionalString(dto.fromEmail);
    }

    if (dto.fromName !== undefined) {
      normalized.fromName = this.normalizeOptionalString(dto.fromName);
    }

    if (dto.replyTo !== undefined) {
      normalized.replyTo = this.normalizeOptionalString(dto.replyTo);
    }

    if (dto.dailyLimit !== undefined) {
      normalized.dailyLimit = dto.dailyLimit;
    }

    if (dto.testRecipient !== undefined) {
      normalized.testRecipient = this.normalizeOptionalString(dto.testRecipient);
    }

    return normalized;
  }

  private normalizeOptionalString(value: string | undefined) {
    if (value === undefined) {
      return undefined;
    }

    return value.trim();
  }

  private resolveNextPassword(currentPassword: string | undefined, nextPassword: string | undefined) {
    if (nextPassword === undefined) {
      return currentPassword;
    }

    const trimmed = nextPassword.trim();
    return trimmed.length > 0 ? trimmed : currentPassword;
  }

  private resolveStoredPassword(
    legacyPassword: string | undefined,
    passwordSecret: EncryptedSettingSecret | undefined
  ) {
    if (this.settingsSecrets.isEncryptedSecret(passwordSecret)) {
      return this.settingsSecrets.decrypt(passwordSecret);
    }

    return legacyPassword;
  }

  private serializeSmtpPayload(payload: SmtpSettingsPayload): SmtpSettingsPayload {
    const { password, passwordSecret: _passwordSecret, ...safePayload } = payload;

    return {
      ...safePayload,
      passwordSecret: password ? this.settingsSecrets.encrypt(password) : undefined
    };
  }

  private resolveSmtpStatus(payload: SmtpSettingsPayload): AdminSettingStatus {
    if (!payload.enabled) {
      return AdminSettingStatus.planned;
    }

    if (this.getMissingRequiredSmtpFields(payload).length > 0) {
      return AdminSettingStatus.needs_review;
    }

    return payload.keycloakSyncStatus === "failed" || payload.lastTestStatus === "failed"
      ? AdminSettingStatus.needs_review
      : AdminSettingStatus.configured;
  }

  private getMissingRequiredSmtpFields(payload: SmtpSettingsPayload) {
    const missingFields: string[] = [];

    if (!payload.host) {
      missingFields.push("host");
    }

    if (!payload.port) {
      missingFields.push("port");
    }

    if (!payload.fromEmail) {
      missingFields.push("fromEmail");
    }

    if (!payload.fromName) {
      missingFields.push("fromName");
    }

    if (payload.username && !payload.password) {
      missingFields.push("password");
    }

    return missingFields;
  }

  private async syncKeycloakSmtpIfReady(payload: SmtpSettingsPayload): Promise<Pick<SmtpSettingsPayload, "syncedToKeycloakAt" | "keycloakSyncStatus" | "keycloakSyncMessage">> {
    if (!payload.enabled) {
      return {
        syncedToKeycloakAt: payload.syncedToKeycloakAt,
        keycloakSyncStatus: "not_synced",
        keycloakSyncMessage: "SMTP is disabled"
      };
    }

    const missingFields = this.getMissingRequiredSmtpFields(payload);

    if (missingFields.length > 0) {
      return {
        syncedToKeycloakAt: payload.syncedToKeycloakAt,
        keycloakSyncStatus: "failed",
        keycloakSyncMessage: `Missing ${missingFields.join(", ")}`
      };
    }

    try {
      await this.keycloakAdmin.updateRealmSmtpSettings(this.toKeycloakSmtpServer(payload));

      return {
        syncedToKeycloakAt: new Date().toISOString(),
        keycloakSyncStatus: "synced",
        keycloakSyncMessage: "Synced to Keycloak realm"
      };
    } catch (error) {
      return {
        syncedToKeycloakAt: payload.syncedToKeycloakAt,
        keycloakSyncStatus: "failed",
        keycloakSyncMessage: error instanceof Error ? error.message.slice(0, 300) : "Keycloak SMTP sync failed"
      };
    }
  }

  private toKeycloakSmtpServer(payload: SmtpSettingsPayload) {
    const smtpServer: Record<string, string> = {
      host: payload.host,
      port: String(payload.port),
      from: payload.fromEmail,
      fromDisplayName: payload.fromName,
      replyTo: payload.replyTo ?? "",
      replyToDisplayName: payload.fromName,
      ssl: payload.security === "ssl" ? "true" : "false",
      starttls: payload.security === "starttls" ? "true" : "false",
      auth: payload.username ? "true" : "false"
    };

    if (payload.username) {
      smtpServer.user = payload.username;
    }

    if (payload.password) {
      smtpServer.password = payload.password;
    }

    return smtpServer;
  }

  private resolveSmtpResponse(payload: SmtpSettingsPayload, status: AdminSettingStatus) {
    return {
      ...this.sanitizeSmtpPayload(payload),
      status,
      missingFields: this.getMissingRequiredSmtpFields(payload)
    };
  }

  private sanitizeSmtpPayload(payload: SmtpSettingsPayload) {
    const { password: _password, passwordSecret: _passwordSecret, ...safePayload } = payload;

    return {
      ...safePayload,
      passwordSet: Boolean(payload.password || payload.passwordSecret)
    };
  }

  private toJson(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
  }

  private async writeAudit(action: string, entityId: string, beforeValue: unknown, afterValue: unknown, actorId?: string) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: "AdminSetting",
        entityId,
        beforeValue: beforeValue === null ? undefined : this.toJson(beforeValue),
        afterValue: this.toJson(afterValue)
      }
    });
  }

  private isPlainRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
  }

  private isSmtpSecurity(value: unknown): value is SmtpSecurity {
    return value === "none" || value === "starttls" || value === "ssl";
  }

  private isSmtpTestStatus(value: unknown): value is SmtpTestStatus {
    return value === "sent" || value === "failed" || value === "not_tested";
  }

  private isSmtpSyncStatus(value: unknown): value is SmtpSyncStatus {
    return value === "synced" || value === "failed" || value === "not_synced";
  }
}
