import { LeaveFormSelect } from "@/components/user/leave-form-select";

const leaveReasons = [
  { label: "Nghỉ ốm", description: "Tối đa: 5 Ngày / Tháng" },
  { label: "Nghỉ thai sản", description: "Tối đa: 180 Ngày / Năm" },
  { label: "Nghỉ không lương", description: "Tối đa: 10 Ngày / Tháng" },
  { label: "Nghỉ phép năm" },
  { label: "Nghỉ khác", description: "Tối đa: 10 Ngày / Năm" },
  { label: "Nghỉ con ốm", description: "Tối đa: 10 Ngày / Tháng" },
  { label: "Nghỉ dưỡng sức sau ốm đau", description: "Tối đa: 2 Ngày / Tháng" },
  { label: "Nghỉ hội nghị, học tập", description: "Tối đa: 5 Ngày / Năm" },
  { label: "Nghỉ dưỡng sức sau thai sản", description: "Tối đa: 30 Ngày / Năm" },
  { label: "Xin làm online", description: "Tối đa: 15 Ngày / Tháng" },
  { label: "Từ thân phụ mẫu mất", description: "Tối đa: 2 Ngày / Năm" },
  { label: "Nghỉ cưới", description: "Tối đa: 3 Ngày / Năm" }
];

export function LeaveReasonSelect() {
  return (
    <LeaveFormSelect
      ariaLabel="Chọn lý do nghỉ"
      menuLabel="Các lý do xin nghỉ"
      options={leaveReasons}
      placeholder="Chọn lý do"
    />
  );
}
