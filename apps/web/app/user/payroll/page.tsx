import { SalaryBoard } from "@/components/user/salary-board";
import { UserFrame } from "@/components/user/user-frame";

export default function UserPayrollPage() {
  return (
    <UserFrame activeModule="payroll">
      <SalaryBoard />
    </UserFrame>
  );
}
