import { AbsenceRequestCreateBoard } from "@/components/user/absence-request-create-board";
import { CheckinOutRequestCreateBoard } from "@/components/user/checkin-out-request-create-board";
import { LeaveRequestCreateBoard } from "@/components/user/leave-request-create-board";
import { OvertimeRequestCreateBoard } from "@/components/user/overtime-request-create-board";
import { ResignationRequestCreateBoard } from "@/components/user/resignation-request-create-board";
import { ShiftChangeRequestCreateBoard } from "@/components/user/shift-change-request-create-board";
import { UserFrame } from "@/components/user/user-frame";
import { getLeaveTypes, getMyBalances, getRequestDetail } from "@/lib/request-api";

type NewRequestPageProps = {
  searchParams?: Promise<{
    type?: string;
    // Editing a draft or returned request.
    id?: string;
  }>;
};

// Request types still shown as static forms until their handlers exist (Phase 3b).
const staticBoards = {
  absence: { title: "Tạo mới đơn vắng mặt", board: <AbsenceRequestCreateBoard /> },
  overtime: { title: "Tạo mới đơn làm thêm", board: <OvertimeRequestCreateBoard /> },
  "checkin-out": { title: "Tạo mới đơn checkin/out", board: <CheckinOutRequestCreateBoard /> },
  "shift-change": { title: "Tạo mới đơn đổi ca", board: <ShiftChangeRequestCreateBoard /> },
  resignation: { title: "Tạo mới đơn xin thôi việc", board: <ResignationRequestCreateBoard /> }
};

export default async function NewRequestPage({ searchParams }: NewRequestPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const staticBoard = staticBoards[params?.type as keyof typeof staticBoards];
  if (staticBoard) {
    return (
      <UserFrame activeModule="requests" showSearch title={staticBoard.title}>
        {staticBoard.board}
      </UserFrame>
    );
  }

  const [leaveTypes, balances, request] = await Promise.all([
    getLeaveTypes(),
    getMyBalances(),
    params?.id ? getRequestDetail(params.id) : Promise.resolve(null)
  ]);
  const editable = request?.ok && request.data.permissions.canEdit ? request.data : null;
  const loadError = !leaveTypes.ok
    ? leaveTypes.error
    : request && !request.ok
      ? request.error
      : request?.ok && !editable
        ? "Đơn này không còn sửa được (chỉ sửa đơn nháp hoặc đơn bị trả lại của chính bạn)."
        : undefined;

  return (
    <UserFrame activeModule="requests" showSearch title={editable ? `Sửa đơn ${editable.code}` : "Tạo mới đơn xin nghỉ"}>
      <LeaveRequestCreateBoard
        balances={balances.ok ? balances.data.balances : []}
        leaveTypes={leaveTypes.ok ? leaveTypes.data : []}
        loadError={loadError}
        request={editable}
      />
    </UserFrame>
  );
}
