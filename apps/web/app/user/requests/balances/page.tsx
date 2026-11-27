import { LeaveBalancesBoard } from "@/components/user/leave-balances-board";
import { RequestModuleTabs } from "@/components/user/request-module-tabs";
import { UserFrame } from "@/components/user/user-frame";
import { getBalanceList, getMyBalances, getRequestAccess } from "@/lib/request-api";

type BalancesPageProps = { searchParams?: Promise<{ year?: string; q?: string; page?: string }> };

export default async function LeaveBalancesPage({ searchParams }: BalancesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const currentYear = Number(new Intl.DateTimeFormat("en", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric" }).format(new Date()));
  const year = Number(params?.year) >= 2000 && Number(params?.year) <= 2100 ? Number(params?.year) : currentYear;
  const access = await getRequestAccess();
  const [mine, list] = await Promise.all([
    access.hasProfile ? getMyBalances(year) : Promise.resolve(null),
    access.canViewBalances ? getBalanceList({ year, q: params?.q, page: Number(params?.page) || 1 }) : Promise.resolve(null)
  ]);

  return (
    <UserFrame activeModule="requests" showSearch title="Quỹ phép">
      <LeaveBalancesBoard
        canAdjust={access.canManageLeave}
        list={list?.ok ? list.data : null}
        listError={list && !list.ok ? list.error : undefined}
        mine={mine?.ok ? mine.data.balances : []}
        mineError={!mine ? "Tài khoản chưa gắn hồ sơ nhân sự." : mine.ok ? undefined : mine.error}
        moduleTabs={<RequestModuleTabs active="balances" />}
        q={params?.q}
        year={year}
      />
    </UserFrame>
  );
}
