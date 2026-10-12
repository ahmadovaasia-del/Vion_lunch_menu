import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/dictionaries";
import { chisinauNow, isValidMonth } from "@/lib/dates";
import { loadMonthlyReport } from "@/lib/report-data";
import type { ReportTotals } from "@/lib/report";
import { MonthNav } from "@/components/month-nav";

export default async function ReportPage({ searchParams }: PageProps<"/admin/report">) {
  const { locale, t } = await getDict();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : chisinauNow().date.slice(0, 7);
  const { report, orderCount } = await loadMonthlyReport(month, t.report.noDepartment);
  const pct = Math.round(report.companyShare * 100);

  const num = "px-2 py-2 text-right tabular-nums";
  const money = (n: number) => n.toFixed(2);
  const totals = (label: string, s: ReportTotals, strong = false) => (
    <tr className={`font-semibold ${strong ? "border-t-2 border-foreground/40 text-base" : "border-t border-border"}`}>
      <td className="px-2 py-2" colSpan={1}>{label}</td>
      <td className={num}>{s.full}</td>
      <td className={num}>{s.half}</td>
      <td className={num}>{money(s.total)}</td>
      <td className={num}>{money(s.company)}</td>
      <td className={num}>{money(s.employee)}</td>
    </tr>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.report.title}</h1>
        <MonthNav path="/admin/report" month={month} locale={locale} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <a href={`/api/report?month=${month}`} className="btn-primary" download>
          {t.report.download}
        </a>
        <span className="text-sm text-muted">{fmt(t.report.orders, { n: orderCount })}</span>
      </div>

      {report.groups.length === 0 ? (
        <p className="card text-muted">{t.report.empty}</p>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full min-w-[36rem] text-sm">
            <thead className="text-muted">
              <tr>
                <th className="px-2 py-2 text-left font-normal">{t.report.employee}</th>
                <th className={`${num} font-normal`}>{t.report.full}</th>
                <th className={`${num} font-normal`}>{t.report.half}</th>
                <th className={`${num} font-normal`}>{t.report.total}</th>
                <th className={`${num} font-normal`}>{fmt(t.report.company, { pct })}</th>
                <th className={`${num} font-normal`}>{t.report.deduction}</th>
              </tr>
            </thead>
            {report.groups.map((g) => (
              <tbody key={g.department ?? ""}>
                <tr className="bg-background">
                  <td colSpan={6} className="px-2 py-1.5 font-medium">{g.department ?? t.report.noDepartment}</td>
                </tr>
                {g.rows.map((r) => (
                  <tr key={r.employeeId} className="border-t border-border">
                    <td className="px-2 py-2">{r.name}</td>
                    <td className={num}>{r.full}</td>
                    <td className={num}>{r.half}</td>
                    <td className={num}>{money(r.total)}</td>
                    <td className={num}>{money(r.company)}</td>
                    <td className={`${num} font-medium`}>{money(r.employee)}</td>
                  </tr>
                ))}
                {totals(t.report.subtotal, g.subtotal)}
              </tbody>
            ))}
            <tfoot>{totals(t.report.grandTotal, report.grand, true)}</tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
