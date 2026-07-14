import { CurrencyCreateBoard } from "@/components/admin/currency-create-board";
import { UserFrame } from "@/components/user/user-frame";

export default function NewCurrencyPage() {
  return (
    <UserFrame activeModule="admin" showSearch title="Thêm mới tiền tệ">
      <CurrencyCreateBoard />
    </UserFrame>
  );
}
