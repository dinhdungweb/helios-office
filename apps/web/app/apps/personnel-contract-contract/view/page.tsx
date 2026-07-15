import { PersonnelContractDetailBoard } from "@/components/user/personnel-contract-detail-board";
import { UserFrame } from "@/components/user/user-frame";
import { getPersonnelContractDetailData } from "@/lib/personnel-contract-directory-api";

type PersonnelContractDetailPageProps = {
  searchParams?: Promise<{
    ID?: string | string[];
    id?: string | string[];
  }>;
};

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PersonnelContractDetailPage({ searchParams }: PersonnelContractDetailPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const contractId = firstParam(params?.ID) ?? firstParam(params?.id);
  const data = await getPersonnelContractDetailData(contractId);
  const title = data.contract?.employeeName ?? "Chi tiết hợp đồng";

  return (
    <UserFrame activeModule="hcns-contracts" showSearch title={title}>
      <PersonnelContractDetailBoard data={data} />
    </UserFrame>
  );
}
