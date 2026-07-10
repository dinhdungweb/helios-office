import { CompanyInfoSettingsBoard } from "@/components/admin/company-info-settings-board";
import { UserFrame } from "@/components/user/user-frame";

export default function CompanyInfoSettingsPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Thông tin doanh nghiệp">
      <CompanyInfoSettingsBoard />
    </UserFrame>
  );
}
