import { RequestsBoard } from "@/components/user/requests-board";
import { UserFrame } from "@/components/user/user-frame";

export default function UserRequestsPage() {
  return (
    <UserFrame activeModule="requests" showSearch title="Danh sách đơn từ năm 2026">
      <RequestsBoard />
    </UserFrame>
  );
}
