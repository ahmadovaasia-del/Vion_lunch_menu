import ExcelJS from "exceljs";

export type ImportedEmployee = {
  full_name: string;
  email: string;
  phone: string | null;
  department: string | null;
  is_active: boolean;
};

type Column = keyof ImportedEmployee;

// Варианты заголовков (ru / ro / en), сравниваются без регистра и пробелов.
const HEADERS: Record<Column, string[]> = {
  full_name: ["имя", "фио", "сотрудник", "имяифамилия", "nume", "numeșiprenume", "numesiprenume", "angajat", "name"],
  email: ["email", "e-mail", "почта", "эл.почта", "mail"],
  phone: ["телефон", "тел", "telefon", "phone"],
  department: ["отдел", "подразделение", "departament", "departamentul", "department"],
  is_active: ["активен", "активный", "статус", "activ", "status", "active"],
};

const normalizeHeader = (s: string) => s.toLowerCase().replace(/\s+/g, "");

const FALSE_VALUES = ["нет", "no", "nu", "0", "false", "-", "неактивен", "inactiv", "inactive"];

export function parseActive(value: string): boolean {
  return !FALSE_VALUES.includes(value.trim().toLowerCase());
}

/** Текст ячейки exceljs: строки, числа, гиперссылки, rich text, формулы. */
export function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return "";
  if (typeof value === "object") {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if ("richText" in value) return value.richText.map((r) => r.text).join("").trim();
    if ("text" in value) return cellText(value.text as ExcelJS.CellValue);
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    return "";
  }
  return String(value).trim();
}

/**
 * Разбирает таблицу (первая строка — заголовки). Строки без имени или
 * с некорректным e-mail пропускаются; повторный e-mail — последний выигрывает.
 */
export function parseEmployeeRows(rows: string[][]): { employees: ImportedEmployee[]; skipped: number } {
  const [header, ...data] = rows;
  if (!header) return { employees: [], skipped: 0 };

  const index = {} as Record<Column, number>;
  header.forEach((h, i) => {
    const key = normalizeHeader(h);
    for (const [col, names] of Object.entries(HEADERS) as [Column, string[]][]) {
      if (index[col] === undefined && names.includes(key)) index[col] = i;
    }
  });
  if (index.full_name === undefined || index.email === undefined) {
    throw new Error("missing_columns");
  }

  const byEmail = new Map<string, ImportedEmployee>();
  let skipped = 0;
  for (const row of data) {
    const get = (col: Column) => (index[col] === undefined ? "" : (row[index[col]] ?? "").trim());
    const full_name = get("full_name");
    const email = get("email").toLowerCase();
    if (!full_name && !email) continue; // пустая строка
    if (!full_name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      skipped++;
      continue;
    }
    if (byEmail.has(email)) skipped++;
    byEmail.set(email, {
      full_name,
      email,
      phone: get("phone") || null,
      department: get("department") || null,
      is_active: index.is_active === undefined || !get("is_active") ? true : parseActive(get("is_active")),
    });
  }
  return { employees: [...byEmail.values()], skipped };
}

export async function readFirstSheet(buffer: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow((row) => {
    const values: string[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      values[col - 1] = cellText(cell.value);
    });
    rows.push(Array.from(values, (v) => v ?? ""));
  });
  return rows;
}
