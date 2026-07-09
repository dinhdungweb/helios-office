import { RequestDetailBoard } from "@/components/user/request-detail-board";
import { UserFrame } from "@/components/user/user-frame";

export default function UserRequestDetailPage() {
  return (
    <UserFrame activeModule="requests" showSearch title="Đơn xin nghỉ">
      <RequestDetailBoard />
    </UserFrame>
  );
}
