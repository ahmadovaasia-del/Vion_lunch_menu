import { NextResponse, type NextRequest } from "next/server";
import { getCurrentEmployee } from "@/lib/auth";
import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/dictionaries";
import { formatMonth, isValidMonth } from "@/lib/dates";
import { loadMonthlyReport } from "@/lib/report-data";
import { buildReportWorkbook } from "@/lib/report-xlsx";

// Выгрузка месячного отчёта в Excel (только администратор).
export async function GET(request: NextRequest) {
  const me = await getCurrentEmployee();
  if (me?.role !== "admin") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const month = request.nextUrl.searchParams.get("month");
  if (!isValidMonth(month)) return NextResponse.json({ error: "bad_month" }, { status: 400 });

  const { locale, t } = await getDict();
  const r = t.report;
  const { report, details } = await loadMonthlyReport(month, r.noDepartment);
  const pct = Math.round(report.companyShare * 100);
  const file = await buildReportWorkbook(report, details, {
    title: fmt(r.fileTitle, { month: formatMonth(month, locale) }),
    employee: r.employee,
    department: r.department,
    noDepartment: r.noDepartment,
    full: r.full,
    half: r.half,
    total: r.total,
    company: fmt(r.company, { pct }),
    deduction: r.deduction,
    subtotal: r.subtotal,
    grandTotal: r.grandTotal,
    summarySheet: r.summarySheet,
    detailsSheet: r.detailsSheet,
    date: r.date,
    variant: r.variant,
    portion: r.portion,
    price: r.price,
    fullLunch: t.history.fullLunch,
    halfLunch: t.history.halfLunch,
  });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lunch-report-${month}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
