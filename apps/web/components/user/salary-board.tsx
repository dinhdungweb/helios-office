import {
  CalendarBlank,
  CaretDown,
  CaretUp
} from "@/lib/icons";

type SalaryMonth = {
  month: string;
  amount?: string;
};

type SalaryDetailGroup = {
  date: string;
  expanded?: boolean;
  rows?: Array<{
    label: string;
    value: string;
  }>;
};

const salaryMonths: SalaryMonth[] = [
  { month: "Tháng 1", amount: "11,737,500" },
  { month: "Tháng 2", amount: "11,607,326.09" },
  { month: "Tháng 3", amount: "11,003,423.08" },
  { month: "Tháng 4", amount: "11,424,500" },
  { month: "Tháng 5", amount: "10,818,500" },
  { month: "Tháng 6", amount: "11,576,500" },
  { month: "Tháng 7", amount: "-" },
  { month: "Tháng 8" },
  { month: "Tháng 9" },
  { month: "Tháng 10" },
  { month: "Tháng 11" },
  { month: "Tháng 12" }
];

const salaryDetails: SalaryDetailGroup[] = [
  {
    date: "01/01/2026",
    expanded: true,
    rows: [
      { label: "Lương cơ bản gross", value: "10,000,000" },
      { label: "Phụ cấp Trách nhiệm", value: "1,500,000" },
      { label: "Phụ cấp ăn trưa", value: "25,000" },
      { label: "Phụ cấp khác", value: "0" }
    ]
  },
  { date: "01/07/2025" },
  { date: "01/01/2025" },
  { date: "01/07/2024" },
  { date: "01/04/2024" },
  { date: "01/01/2024" }
];

function SalaryMonthCell({ month }: { month: SalaryMonth }) {
  return (
    <article className="salary-month-cell">
      <h3>{month.month}</h3>
      {month.amount ? (
        <button className="salary-month-card" type="button" aria-label={`${month.month}, lương thực nhận ${month.amount}`}>
          <span>Lương thực nhận</span>
          <strong>{month.amount}</strong>
        </button>
      ) : null}
    </article>
  );
}

function SalaryDetailItem({ item }: { item: SalaryDetailGroup }) {
  return (
    <article className={item.expanded ? "salary-detail-item is-open" : "salary-detail-item"}>
      <button type="button" aria-expanded={item.expanded ? "true" : "false"}>
        <strong>{item.date}</strong>
        {item.expanded ? (
          <CaretDown size={18} weight="duotone" aria-hidden="true" />
        ) : (
          <CaretUp size={18} weight="duotone" aria-hidden="true" />
        )}
      </button>

      {item.expanded && item.rows ? (
        <dl className="salary-detail-list">
          {item.rows.map((row) => (
            <div key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </article>
  );
}

export function SalaryBoard() {
  return (
    <main className="salary-board-page" aria-label="Bảng lương">
      <header className="salary-board-toolbar">
        <div className="salary-board-tabs" role="tablist" aria-label="Phạm vi bảng lương">
          <button className="is-active" type="button" role="tab" aria-selected="true">
            Của bạn
          </button>
          <button type="button" role="tab" aria-selected="false">
            Tất cả
          </button>
        </div>

        <button className="salary-year-select" type="button" aria-label="Chọn năm">
          <CalendarBlank size={16} weight="duotone" aria-hidden="true" />
          Chọn năm
        </button>
      </header>

      <section className="salary-board-layout">
        <section className="salary-year-panel" aria-labelledby="salary-year-title">
          <header>
            <h2 id="salary-year-title">Lương thực nhận 2026</h2>
          </header>

          <div className="salary-month-grid">
            {salaryMonths.map((month) => (
              <SalaryMonthCell month={month} key={month.month} />
            ))}
          </div>
        </section>

        <aside className="salary-detail-panel" aria-labelledby="salary-detail-title">
          <header>
            <h2 id="salary-detail-title">Lương thực nhận năm</h2>
          </header>

          <div className="salary-detail-stack">
            {salaryDetails.map((item) => (
              <SalaryDetailItem item={item} key={item.date} />
            ))}
          </div>
        </aside>
      </section>
    </main>
  );
}
