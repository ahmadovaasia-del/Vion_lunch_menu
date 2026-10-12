import ExcelJS from "exceljs";
import type { MonthlyReport, ReportTotals } from "@/lib/report";

export type DetailRow = { date: string; name: string; department: string; variant: string; portion: "full" | "half"; price: number };

export type ReportLabels = {
  title: string; // «Обеды за октябрь 2026»
  employee: string;
  department: string;
  noDepartment: string;
  full: string;
  half: string;
  total: string;
  company: string;
  deduction: string;
  subtotal: string; // «Итого по отделу»
  grandTotal: string; // «Итого по офису»
  detailsSheet: string;
  summarySheet: string;
  date: string;
  variant: string;
  portion: string;
  price: string;
  fullLunch: string;
  halfLunch: string;
};

const MONEY = "#,##0.00";

/** Excel для бухгалтерии: лист «Свод» (по отделам + итоги) и лист «По дням». */
export async function buildReportWorkbook(report: MonthlyReport, details: DetailRow[], l: ReportLabels): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Vion Lunch";

  const ws = wb.addWorksheet(l.summarySheet, { views: [{ state: "frozen", ySplit: 3 }] });
  ws.columns = [
    { key: "n", width: 5 },
    { key: "name", width: 32 },
    { key: "full", width: 10 },
    { key: "half", width: 10 },
    { key: "total", width: 14, style: { numFmt: MONEY } },
    { key: "company", width: 16, style: { numFmt: MONEY } },
    { key: "employee", width: 18, style: { numFmt: MONEY } },
  ];
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = l.title;
  ws.getCell("A1").font = { bold: true, size: 14 };

  const header = ws.getRow(3);
  header.values = ["№", l.employee, l.full, l.half, l.total, l.company, l.deduction];
  header.font = { bold: true };
  header.alignment = { wrapText: true, vertical: "middle" };
  header.eachCell((c) => {
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F1EC" } };
    c.border = { bottom: { style: "thin" } };
  });

  const totalsRow = (label: string, t: ReportTotals, strong: boolean) => {
    const row = ws.addRow({ name: label, full: t.full, half: t.half, total: t.total, company: t.company, employee: t.employee });
    row.font = { bold: true, size: strong ? 12 : 11 };
    row.eachCell((c) => (c.border = { top: { style: strong ? "double" : "thin" } }));
  };

  let n = 0;
  for (const g of report.groups) {
    const titleRow = ws.addRow({ name: g.department ?? l.noDepartment });
    titleRow.font = { bold: true, italic: true };
    for (const r of g.rows) {
      ws.addRow({ n: ++n, name: r.name, full: r.full, half: r.half, total: r.total, company: r.company, employee: r.employee });
    }
    totalsRow(`${l.subtotal}: ${g.department ?? l.noDepartment}`, g.subtotal, false);
    ws.addRow({});
  }
  totalsRow(l.grandTotal, report.grand, true);

  const ds = wb.addWorksheet(l.detailsSheet, { views: [{ state: "frozen", ySplit: 1 }] });
  ds.columns = [
    { header: l.date, key: "date", width: 12 },
    { header: l.employee, key: "name", width: 32 },
    { header: l.department, key: "department", width: 20 },
    { header: l.variant, key: "variant", width: 9 },
    { header: l.portion, key: "portion", width: 16 },
    { header: l.price, key: "price", width: 10, style: { numFmt: MONEY } },
  ];
  ds.getRow(1).font = { bold: true };
  for (const d of details) {
    const [y, m, day] = d.date.split("-").map(Number);
    ds.addRow({ ...d, date: new Date(Date.UTC(y, m - 1, day)), portion: d.portion === "full" ? l.fullLunch : l.halfLunch });
  }
  ds.getColumn("date").numFmt = "dd.mm.yyyy";
  ds.autoFilter = { from: "A1", to: "F1" };

  return Buffer.from(await wb.xlsx.writeBuffer());
}
