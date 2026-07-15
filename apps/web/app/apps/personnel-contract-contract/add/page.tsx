import { PersonnelContractCreateBoard } from "@/components/user/personnel-contract-create-board";
import { UserFrame } from "@/components/user/user-frame";
import { getEmployeeCreateData } from "@/lib/employee-profile-api";

export default async function PersonnelContractCreatePage() {
  const data = await getEmployeeCreateData();

  return (
    <UserFrame activeModule="hcns-contracts" showSearch title="Tạo mới hợp đồng">
      <PersonnelContractCreateBoard data={data} />
    </UserFrame>
  );
}
