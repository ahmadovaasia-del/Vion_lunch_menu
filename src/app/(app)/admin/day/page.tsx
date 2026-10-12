import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { addDays, chisinauNow, formatDay, isValidDate } from "@/lib/dates";
import { dishName, type MenuDay } from "@/lib/menu";
import { summarize, type Choice } from "@/lib/orders";
import type { Department, Employee } from "@/lib/types";
import { ChoicePicker } from "@/components/choice-picker";
import { SummaryTable } from "@/components/summary-table";

type OrderRow = Choice & { employee_id: string };
type ChangeRow = { employee_id: string; old_value: string | null; new_value: string | null; changed_by: string | null; changed_at: string };

export default async function DayPage({ searchParams }: PageProps<"/admin/day">) {
  const { locale, t } = await getDict();
  const { date: dateParam } = await searchParams;
  const today = chisinauNow().date;
  const date = isValidDate(dateParam) ? dateParam : today;

  const db = createAdminClient();
  const [{ data: menu }, { data: orders }, { data: employees }, { data: departments }, { data: changes }] = await Promise.all([
    db.from("menu_days").select("*").eq("date", date).maybeSingle<MenuDay>(),
    db.from("orders").select("employee_id, variant, portion").eq("date", date).returns<OrderRow[]>(),
    db.from("employees").select("*").order("full_name").returns<Employee[]>(),
    db.from("departments").select("id, name").order("name").returns<Department[]>(),
    db.from("order_changes").select("*").eq("date", date).order("changed_at", { ascending: false }).returns<ChangeRow[]>(),
  ]);

  const orderBy = new Map((orders ?? []).map((o) => [o.employee_id, { variant: o.variant, portion: o.portion }]));
  const allEmployees = employees ?? [];
  const nameOf = new Map(allEmployees.map((e) => [e.id, e.full_name]));
  // Активные сотрудники + неактивные, у которых есть заказ на этот день.
  const list = allEmployees.filter((e) => e.is_active || orderBy.has(e.id));
  const groups = [
    ...(departments ?? []).map((d) => ({ name: d.name, items: list.filter((e) => e.department_id === d.id) })),
    { name: "—", items: list.filter((e) => !e.department_id) },
  ].filter((g) => g.items.length);

  const summary = summarize(orders ?? []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.day.title}</h1>
        <div className="flex items-center gap-2">
          <Link href={`/admin/day?date=${addDays(date, -1)}`} className="btn-secondary px-3 py-1.5 text-sm">←</Link>
          <Link href="/admin/day" className="btn-secondary px-3 py-1.5 text-sm">{t.nav.today}</Link>
          <Link href={`/admin/day?date=${addDays(date, 1)}`} className="btn-secondary px-3 py-1.5 text-sm">→</Link>
        </div>
      </div>
      <p className="font-medium capitalize">{formatDay(date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>

      {!menu ? (
        <p className="card text-muted">{t.day.noMenu}</p>
      ) : (
        <>
          <section className="card flex flex-col gap-2 p-0 pt-3">
            <h2 className="px-4 font-semibold">{t.day.summary}</h2>
            <p className="px-4 text-sm text-muted">
              {t.menu.soup}: {dishName(menu, "soup", locale)} · A: {dishName(menu, "main_a", locale)} · B: {dishName(menu, "main_b", locale)}
            </p>
            <SummaryTable t={t.day} s={summary} />
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">{t.day.employees}</h2>
            <p className="text-sm text-muted">{t.day.adminHint}</p>
            {groups.map((g) => (
              <div key={g.name} className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-muted">{g.name}</h3>
                <ul className="card divide-y divide-border p-0">
                  {g.items.map((e) => (
                    <li key={e.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1fr_20rem] sm:items-center">
                      <span className={e.is_active ? "" : "opacity-60"}>{e.full_name}</span>
                      <ChoicePicker
                        t={t.order}
                        date={date}
                        initial={orderBy.get(e.id) ?? null}
                        locked={false}
                        prices={null}
                        employeeId={e.id}
                        compact
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>

          {!!changes?.length && (
            <section className="card flex flex-col gap-2">
              <h2 className="font-semibold">{t.day.changes}</h2>
              <ul className="flex flex-col gap-1 text-sm">
                {changes.map((c, i) => (
                  <li key={i} className="text-muted">
                    {new Date(c.changed_at).toLocaleTimeString(locale === "ro" ? "ro-MD" : "ru-RU", { timeZone: "Europe/Chisinau", hour: "2-digit", minute: "2-digit" })}
                    {" · "}
                    <span className="text-foreground">{nameOf.get(c.employee_id)}</span>: {c.old_value ?? "—"} → {c.new_value ?? "—"}
                    {c.changed_by && ` (${nameOf.get(c.changed_by)})`}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
