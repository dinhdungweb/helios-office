import { PersonnelContractDirectoryBoard } from "@/components/user/personnel-contract-directory-board";
import { UserFrame } from "@/components/user/user-frame";
import { getPersonnelContractDirectoryData } from "@/lib/personnel-contract-directory-api";

export default async function PersonnelContractDirectoryPage() {
  const data = await getPersonnelContractDirectoryData();

  return (
    <UserFrame activeModule="hcns-contracts" showSearch title="Loại hợp đồng">
      <PersonnelContractDirectoryBoard data={data} />
    </UserFrame>
  );
}
