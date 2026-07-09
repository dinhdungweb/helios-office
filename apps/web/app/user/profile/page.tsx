import { ProfileBoard, type ProfileTabKey } from "@/components/user/profile-board";
import { UserFrame } from "@/components/user/user-frame";

type UserProfilePageProps = {
  searchParams?: Promise<{
    tab?: string;
  }>;
};

function resolveProfileTab(tab?: string): ProfileTabKey {
  if (tab === "resume" || tab === "work" || tab === "benefit" || tab === "allowance" || tab === "furlough") {
    return tab;
  }

  if (tab === "salary") {
    return "allowance";
  }

  if (tab === "leave") {
    return "furlough";
  }

  return "overview";
}

export default async function UserProfilePage({ searchParams }: UserProfilePageProps) {
  const params = searchParams ? await searchParams : undefined;

  return (
    <UserFrame activeModule="profile">
      <ProfileBoard activeTab={resolveProfileTab(params?.tab)} />
    </UserFrame>
  );
}
