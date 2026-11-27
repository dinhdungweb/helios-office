import { RequestModuleTabs } from "@/components/user/request-module-tabs";
import { RequestsBoard } from "@/components/user/requests-board";
import { UserFrame } from "@/components/user/user-frame";
import { getRequestAccess, getRequestList, getToApproveCount } from "@/lib/request-api";
import type { RequestBox } from "@/lib/request-format";

type UserRequestsPageProps = {
  searchParams?: Promise<{ box?: string; status?: string; type?: string; q?: string; page?: string }>;
};

const PERSONAL_BOXES: RequestBox[] = ["mine", "to_approve", "processed", "following"];

export default async function UserRequestsPage({ searchParams }: UserRequestsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const access = await getRequestAccess();
  const boxes = access.canViewAll ? [...PERSONAL_BOXES, "all" as const] : PERSONAL_BOXES;
  const box = boxes.includes(params?.box as RequestBox) ? (params!.box as RequestBox) : "mine";
  const filters = { status: params?.status || undefined, type: params?.type || undefined, q: params?.q || undefined };
  const [list, toApproveCount] = await Promise.all([
    getRequestList({ box, ...filters, page: Number(params?.page) || 1 }),
    getToApproveCount()
  ]);

  return (
    <UserFrame activeModule="requests" showSearch title="Đơn từ">
      <RequestsBoard
        box={box}
        boxes={boxes}
        error={list.ok ? undefined : list.error}
        filters={filters}
        list={list.ok ? list.data : null}
        moduleTabs={<RequestModuleTabs active="list" />}
        toApproveCount={toApproveCount}
      />
    </UserFrame>
  );
}
