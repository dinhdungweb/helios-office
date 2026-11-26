import type { Route } from "next";
import Link from "next/link";
import { RequestDetailBoard } from "@/components/user/request-detail-board";
import { UserFrame } from "@/components/user/user-frame";
import { getRequestDetail, getRequestTimeline } from "@/lib/request-api";

type UserRequestDetailPageProps = {
  searchParams?: Promise<{ id?: string }>;
};

export default async function UserRequestDetailPage({ searchParams }: UserRequestDetailPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const id = params?.id;
  const [detail, timeline] = id ? await Promise.all([getRequestDetail(id), getRequestTimeline(id)]) : [null, null];

  if (!detail?.ok) {
    return (
      <UserFrame activeModule="requests" showSearch title="Chi tiết đơn">
        <main className="request-detail-page request-detail-missing">
          <p>{detail ? detail.error : "Chưa chọn đơn."}</p>
          <Link className="secondary-button" href={"/user/requests" as Route}>
            Về danh sách đơn
          </Link>
        </main>
      </UserFrame>
    );
  }

  return (
    <UserFrame activeModule="requests" showSearch title={`${detail.data.title} ${detail.data.code}`}>
      <RequestDetailBoard request={detail.data} timeline={timeline?.ok ? timeline.data : []} />
    </UserFrame>
  );
}
