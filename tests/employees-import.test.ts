import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parseActive, parseEmployeeRows, readFirstSheet } from "@/lib/employees-import";

describe("parseEmployeeRows", () => {
  it("распознаёт русские заголовки и нормализует e-mail", () => {
    const { employees, skipped } = parseEmployeeRows([
      ["Имя", "E-mail", "Телефон", "Отдел", "Активен"],
      ["Иван Петров", " Ivan@Firm.MD ", "+373 69 000000", "Бухгалтерия", "да"],
      ["Ana Rusu", "ana@firm.md", "", "", "нет"],
    ]);
    expect(skipped).toBe(0);
    expect(employees).toEqual([
      { full_name: "Иван Петров", email: "ivan@firm.md", phone: "+373 69 000000", department: "Бухгалтерия", is_active: true },
      { full_name: "Ana Rusu", email: "ana@firm.md", phone: null, department: null, is_active: false },
    ]);
  });

  it("понимает румынские заголовки в любом порядке, без столбца «Активен»", () => {
    const { employees } = parseEmployeeRows([
      ["Departament", "E-mail", "Nume"],
      ["IT", "x@y.md", "Ion"],
    ]);
    expect(employees).toEqual([{ full_name: "Ion", email: "x@y.md", phone: null, department: "IT", is_active: true }]);
  });

  it("пропускает строки без имени или с плохим e-mail, пустые игнорирует", () => {
    const { employees, skipped } = parseEmployeeRows([
      ["Имя", "Email"],
      ["", "a@b.md"],
      ["Петя", "не-почта"],
      ["", ""],
      ["Оля", "olya@b.md"],
    ]);
    expect(employees.map((e) => e.email)).toEqual(["olya@b.md"]);
    expect(skipped).toBe(2);
  });

  it("ошибка, если нет обязательных столбцов", () => {
    expect(() => parseEmployeeRows([["Телефон"], ["1"]])).toThrow("missing_columns");
  });

  it("parseActive", () => {
    for (const v of ["да", "Da", "yes", "1", "+"]) expect(parseActive(v)).toBe(true);
    for (const v of ["нет", "NU", "no", "0", "false"]) expect(parseActive(v)).toBe(false);
  });
});

describe("readFirstSheet", () => {
  it("читает .xlsx, включая e-mail-гиперссылки", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Лист1");
    ws.addRow(["Имя", "E-mail", "Отдел"]);
    ws.addRow(["Иван", { text: "ivan@firm.md", hyperlink: "mailto:ivan@firm.md" }, "IT"]);
    const buf = await wb.xlsx.writeBuffer();
    const rows = await readFirstSheet(buf as ArrayBuffer);
    expect(parseEmployeeRows(rows).employees[0]).toMatchObject({ full_name: "Иван", email: "ivan@firm.md", department: "IT" });
  });
});
