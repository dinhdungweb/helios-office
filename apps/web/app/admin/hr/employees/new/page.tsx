import { EmployeeCreateBoard } from "@/components/admin/employee-create-board";
import { UserFrame } from "@/components/user/user-frame";
import { getEmployeeCreateData } from "@/lib/employee-profile-api";

export default async function NewEmployeePage() {
  const data = await getEmployeeCreateData();

  return (
    <UserFrame activeModule="admin" showSearch title="Tạo mới hồ sơ nhân sự">
      <EmployeeCreateBoard data={data} />
    </UserFrame>
  );
}
