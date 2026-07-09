import { AbsenceRequestCreateBoard } from "@/components/user/absence-request-create-board";
import { CheckinOutRequestCreateBoard } from "@/components/user/checkin-out-request-create-board";
import { LeaveRequestCreateBoard } from "@/components/user/leave-request-create-board";
import { OvertimeRequestCreateBoard } from "@/components/user/overtime-request-create-board";
import { ResignationRequestCreateBoard } from "@/components/user/resignation-request-create-board";
import { ShiftChangeRequestCreateBoard } from "@/components/user/shift-change-request-create-board";
import { UserFrame } from "@/components/user/user-frame";

type NewRequestPageProps = {
  searchParams?: Promise<{
    type?: string;
  }>;
};

const requestCreateMeta = {
  absence: {
    title: "Tạo mới đơn vắng mặt",
    board: <AbsenceRequestCreateBoard />
  },
  leave: {
    title: "Tạo mới đơn xin nghỉ",
    board: <LeaveRequestCreateBoard />
  },
  overtime: {
    title: "Tạo mới đơn làm thêm",
    board: <OvertimeRequestCreateBoard />
  },
  "checkin-out": {
    title: "Tạo mới đơn checkin/out",
    board: <CheckinOutRequestCreateBoard />
  },
  "shift-change": {
    title: "Tạo mới đơn đổi ca",
    board: <ShiftChangeRequestCreateBoard />
  },
  resignation: {
    title: "Tạo mới đơn xin thôi việc",
    board: <ResignationRequestCreateBoard />
  }
};

export default async function NewRequestPage({ searchParams }: NewRequestPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const requestType =
    params?.type === "absence" ||
    params?.type === "overtime" ||
    params?.type === "checkin-out" ||
    params?.type === "shift-change" ||
    params?.type === "resignation"
      ? params.type
      : "leave";
  const meta = requestCreateMeta[requestType];

  return (
    <UserFrame activeModule="requests" showSearch title={meta.title}>
      {meta.board}
    </UserFrame>
  );
}
