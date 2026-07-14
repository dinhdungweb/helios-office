import { notFound } from "next/navigation";
import { UserGroupDetailBoard } from "@/components/admin/user-group-detail-board";
import { UserFrame } from "@/components/user/user-frame";
import { getAccountAccessData, type PermissionGroup } from "@/lib/account-access-api";

type UserGroupDetailPageProps = {
  params: Promise<{
    groupId: string;
  }>;
};

const hiddenPermissionGroupIds = new Set(["grp-system-admin"]);

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function findGroup(groups: PermissionGroup[], rawGroupId: string) {
  const decodedGroupId = decodeURIComponent(rawGroupId);
  const numericIndex = Number(decodedGroupId);
  const visibleGroups = groups.filter((group) => !hiddenPermissionGroupIds.has(group.id));

  if (Number.isInteger(numericIndex) && numericIndex > 0) {
    return visibleGroups[numericIndex - 1];
  }

  const normalizedGroupId = normalizeText(decodedGroupId);

  return visibleGroups.find(
    (group) =>
      group.id === decodedGroupId ||
      normalizeText(group.id) === normalizedGroupId ||
      normalizeText(group.name) === normalizedGroupId
  );
}

export default async function UserGroupDetailPage({ params }: UserGroupDetailPageProps) {
  const { groupId } = await params;
  const accountAccessData = await getAccountAccessData();
  const group = findGroup(accountAccessData.groups, groupId);

  if (!group) {
    notFound();
  }

  return (
    <UserFrame activeModule="admin" showSearch title={group.name}>
      <UserGroupDetailBoard data={accountAccessData} group={group} />
    </UserFrame>
  );
}
