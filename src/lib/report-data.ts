import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { monthRange } from "@/lib/dates";
import { buildMonthlyReport } from "@/lib/report";
import type { DetailRow } from "@/lib/report-xlsx";
import type { Order } from "@/lib/orders";
import type { Department, Employee } from "@/lib/types";

const PAGE = 1000; // лимит строк Supabase на один запрос

async function fetchMonthOrders(from: string, to: string): Promise<Order[]> {
  const db = createAdminClient();
  const all: Order[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db
      .from("orders")
      .select("employee_id, date, variant, portion, price")
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .order("id")
      .range(offset, offset + PAGE - 1)
      .returns<Order[]>();
    if (error) throw error;
    all.push(...data);
    if (data.length < PAGE) return all;
  }
}

export async function loadMonthlyReport(month: string, noDepartment: string) {
  const { from, to } = monthRange(month);
  const db = createAdminClient();
  const [orders, settings, { data: employees }, { data: departments }] = await Promise.all([
    fetchMonthOrders(from, to),
    getSettings(),
    db.from("employees").select("id, full_name, email, department_id").returns<Employee[]>(),
    db.from("departments").select("id, name").returns<Department[]>(),
  ]);
  const emps = employees ?? [];
  const depts = departments ?? [];
  const report = buildMonthlyReport(orders, emps, depts, settings.company_share);

  const empById = new Map(emps.map((e) => [e.id, e]));
  const deptName = new Map(depts.map((d) => [d.id, d.name]));
  const details: DetailRow[] = orders
    .map((o) => {
      const e = empById.get(o.employee_id);
      return {
        date: o.date,
        name: e?.full_name ?? o.employee_id,
        department: (e?.department_id && deptName.get(e.department_id)) || noDepartment,
        variant: o.variant,
        portion: o.portion,
        price: Number(o.price),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name, "ru"));

  return { report, details, orderCount: orders.length };
}
