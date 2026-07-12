import { EmployeeCreateBoard } from "@/components/admin/employee-create-board";
import { UserFrame } from "@/components/user/user-frame";
import { getEmployeeCreateData } from "@/lib/employee-profile-api";

export default async function HcnsNewEmployeePage() {
  const data = await getEmployeeCreateData();

  return (
    <UserFrame activeModule="hcns" showSearch title="Tạo mới hồ sơ nhân sự">
      <EmployeeCreateBoard data={data} returnHref="/hcns/employees" />
    </UserFrame>
  );
}
