import { CompanyInfoSettingsBoard } from "@/components/admin/company-info-settings-board";
import { UserFrame } from "@/components/user/user-frame";
import { getCompanyInfoSettingsData } from "@/lib/admin-settings-api";

export default async function CompanyInfoSettingsPage() {
  const data = await getCompanyInfoSettingsData();

  return (
    <UserFrame activeModule="admin" showSearch title="Thông tin doanh nghiệp">
      <CompanyInfoSettingsBoard data={data} />
    </UserFrame>
  );
}
