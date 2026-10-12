import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { buildMonthlyReport } from "@/lib/report";
import { buildReportWorkbook, type ReportLabels } from "@/lib/report-xlsx";

const employees = [
  { id: "e1", full_name: "Петров Иван", email: "i@x.md", department_id: "d1" },
  { id: "e2", full_name: "Андреева Ольга", email: "o@x.md", department_id: "d1" },
  { id: "e3", full_name: "Rusu Ana", email: "a@x.md", department_id: "d2" },
  { id: "e4", full_name: "Без Отдела", email: "b@x.md", department_id: null },
  { id: "e5", full_name: "Не Заказывал", email: "n@x.md", department_id: "d2" },
];
const departments = [
  { id: "d1", name: "Бухгалтерия" },
  { id: "d2", name: "IT" },
];
const o = (employee_id: string, portion: "full" | "half", price: number | string) => ({ employee_id, portion, price });
const orders = [
  o("e1", "full", "60.00"), o("e1", "full", "60.00"), o("e1", "half", "40.00"),
  o("e2", "half", 40),
  o("e3", "full", 60), o("e3", "half", 45.5),
  o("e4", "full", 60),
];

describe("buildMonthlyReport", () => {
  const r = buildMonthlyReport(orders, employees, departments, 0.5);

  it("строки по сотрудникам, группы по отделам (русская сортировка: кириллица раньше латиницы), «без отдела» в конце", () => {
    expect(r.groups.map((g) => g.department)).toEqual(["Бухгалтерия", "IT", null]);
    expect(r.groups[0].rows.map((x) => x.name)).toEqual(["Андреева Ольга", "Петров Иван"]);
    expect(r.groups[0].rows[1]).toMatchObject({ full: 2, half: 1, total: 160, company: 80, employee: 80 });
  });

  it("сотрудники без заказов в отчёт не попадают", () => {
    expect(r.groups.flatMap((g) => g.rows).some((x) => x.employeeId === "e5")).toBe(false);
  });

  it("итоги по отделам и по офису сходятся", () => {
    expect(r.groups[0].subtotal).toEqual({ full: 2, half: 2, total: 200, company: 100, employee: 100 });
    expect(r.groups[1].subtotal).toMatchObject({ full: 1, half: 1, total: 105.5 });
    expect(r.grand).toMatchObject({ full: 4, half: 3, total: 365.5 });
    expect(r.grand.company + r.grand.employee).toBeCloseTo(r.grand.total, 10);
  });
});

describe("buildReportWorkbook", () => {
  it("создаёт xlsx со сводом и детализацией", async () => {
    const r = buildMonthlyReport(orders, employees, departments, 0.5);
    const labels = Object.fromEntries(
      ["title", "employee", "department", "noDepartment", "full", "half", "total", "company", "deduction", "subtotal", "grandTotal", "date", "variant", "portion", "price", "fullLunch", "halfLunch"].map((k) => [k, k]),
    ) as ReportLabels;
    labels.summarySheet = "Свод";
    labels.detailsSheet = "По дням";
    const buf = await buildReportWorkbook(r, [{ date: "2026-10-13", name: "Петров Иван", department: "Бухгалтерия", variant: "A", portion: "full", price: 60 }], labels);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const ws = wb.getWorksheet("Свод")!;
    const rows: unknown[][] = [];
    ws.eachRow((row) => rows.push((row.values as unknown[]).slice(1)));
    expect(rows.at(-1)).toEqual([undefined, "grandTotal", 4, 3, 365.5, 182.75, 182.75]);
    expect(rows.some((x) => x[1] === "Петров Иван" && x[4] === 160)).toBe(true);
    expect(wb.getWorksheet("По дням")!.rowCount).toBe(2);
  });
});
