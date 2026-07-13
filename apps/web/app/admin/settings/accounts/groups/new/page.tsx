import { UserGroupCreateBoard } from "@/components/admin/user-group-create-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAccountAccessData } from "@/lib/account-access-api";

export default async function NewUserGroupPage() {
  const accountAccessData = await getAccountAccessData();

  return (
    <UserFrame activeModule="admin" showSearch title="Tạo mới nhóm">
      <UserGroupCreateBoard data={accountAccessData} />
    </UserFrame>
  );
}
