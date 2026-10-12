import { totalsFor, type EmployeeTotals, type Order } from "@/lib/orders";

export type ReportRow = { employeeId: string; name: string; email: string } & EmployeeTotals;
export type ReportTotals = { full: number; half: number; total: number; company: number; employee: number };
export type ReportGroup = { department: string | null; rows: ReportRow[]; subtotal: ReportTotals };
export type MonthlyReport = { groups: ReportGroup[]; grand: ReportTotals; companyShare: number };

type Emp = { id: string; full_name: string; email: string; department_id: string | null };
type Dept = { id: string; name: string };

const round2 = (n: number) => Math.round(n * 100) / 100;

function sumRows(rows: ReportTotals[]): ReportTotals {
  const t = { full: 0, half: 0, total: 0, company: 0, employee: 0 };
  for (const r of rows) {
    t.full += r.full;
    t.half += r.half;
    t.total = round2(t.total + r.total);
    t.company = round2(t.company + r.company);
    t.employee = round2(t.employee + r.employee);
  }
  return t;
}

/**
 * Месячный отчёт: строка на каждого сотрудника с заказами, итоги по отделам
 * и по офису. Итоги — суммы строк, чтобы в Excel всё сходилось до бани.
 */
export function buildMonthlyReport(
  orders: Pick<Order, "employee_id" | "portion" | "price">[],
  employees: Emp[],
  departments: Dept[],
  companyShare: number,
): MonthlyReport {
  const byEmployee = new Map<string, typeof orders>();
  for (const o of orders) {
    const list = byEmployee.get(o.employee_id) ?? [];
    list.push(o);
    byEmployee.set(o.employee_id, list);
  }

  const empById = new Map(employees.map((e) => [e.id, e]));
  const knownDept = new Set(departments.map((d) => d.id));
  const rows = [...byEmployee.entries()]
    .map(([id, list]) => {
      const e = empById.get(id);
      const row: ReportRow = { employeeId: id, name: e?.full_name ?? id, email: e?.email ?? "", ...totalsFor(list, companyShare) };
      const deptId = e?.department_id && knownDept.has(e.department_id) ? e.department_id : null;
      return { departmentId: deptId, row };
    })
    .sort((a, b) => a.row.name.localeCompare(b.row.name, "ru"));

  const deptOrder = [...departments].sort((a, b) => a.name.localeCompare(b.name, "ru"));
  const groups: ReportGroup[] = [
    ...deptOrder.map((d) => ({ department: d.name as string | null, id: d.id as string | null })),
    { department: null, id: null },
  ]
    .map(({ department, id }) => {
      const groupRows = rows.filter((r) => r.departmentId === id).map((r) => r.row);
      return { department, rows: groupRows, subtotal: sumRows(groupRows) };
    })
    .filter((g) => g.rows.length > 0);

  return { groups, grand: sumRows(groups.map((g) => g.subtotal)), companyShare };
}
