import { AbsenceRequestCreateBoard } from "@/components/user/absence-request-create-board";
import { CheckinOutRequestCreateBoard } from "@/components/user/checkin-out-request-create-board";
import { LeaveRequestCreateBoard } from "@/components/user/leave-request-create-board";
import { OvertimeRequestCreateBoard } from "@/components/user/overtime-request-create-board";
import { ResignationRequestCreateBoard } from "@/components/user/resignation-request-create-board";
import { ShiftChangeRequestCreateBoard } from "@/components/user/shift-change-request-create-board";
import { UserFrame } from "@/components/user/user-frame";
import { getLeaveTypes, getMyBalances, getRequestDetail } from "@/lib/request-api";
import { requestTypeOfSlug, type RequestDetail } from "@/lib/request-format";

type NewRequestPageProps = {
  searchParams?: Promise<{
    // Form slug (absence, overtime, checkin-out, shift-change, resignation) or the request type itself.
    type?: string;
    // Editing a draft or returned request.
    id?: string;
  }>;
};

type FormProps = { request: RequestDetail | null; loadError?: string };

// Phase 3b task 9: every attendance request type has a form on the real API.
const forms: Record<string, { title: string; render: (props: FormProps) => React.ReactNode }> = {
  absence: { title: "Tạo mới đơn vắng mặt", render: (props) => <AbsenceRequestCreateBoard {...props} /> },
  overtime: { title: "Tạo mới đơn làm thêm", render: (props) => <OvertimeRequestCreateBoard {...props} /> },
  checkin_out: { title: "Tạo mới đơn checkin/out", render: (props) => <CheckinOutRequestCreateBoard {...props} /> },
  shift_change: { title: "Tạo mới đơn đổi ca", render: (props) => <ShiftChangeRequestCreateBoard {...props} /> },
  resignation: { title: "Tạo mới đơn xin thôi việc", render: (props) => <ResignationRequestCreateBoard {...props} /> }
};

export default async function NewRequestPage({ searchParams }: NewRequestPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const type = requestTypeOfSlug(params?.type) ?? "leave";
  const request = params?.id ? await getRequestDetail(params.id) : null;
  const editable = request?.ok && request.data.permissions.canEdit && request.data.type === type ? request.data : null;
  const requestError =
    request && !request.ok
      ? request.error
      : request?.ok && !editable
        ? "Đơn này không còn sửa được (chỉ sửa đơn nháp hoặc đơn bị trả lại của chính bạn)."
        : undefined;

  const form = forms[type];
  if (form) {
    return (
      <UserFrame activeModule="requests" showSearch title={editable ? `Sửa đơn ${editable.code}` : form.title}>
        {form.render({ request: editable, loadError: requestError })}
      </UserFrame>
    );
  }

  const [leaveTypes, balances] = await Promise.all([getLeaveTypes(), getMyBalances()]);
  const loadError = !leaveTypes.ok ? leaveTypes.error : requestError;

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
