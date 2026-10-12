import { requireEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/dictionaries";
import { chisinauNow, formatDay, isValidMonth, monthRange } from "@/lib/dates";
import { totalsFor, type Order } from "@/lib/orders";
import { MonthNav } from "@/components/month-nav";

export default async function HistoryPage({ searchParams }: PageProps<"/history">) {
  const me = await requireEmployee();
  const { locale, t } = await getDict();
  const { month: monthParam } = await searchParams;
  const month = isValidMonth(monthParam) ? monthParam : chisinauNow().date.slice(0, 7);
  const { from, to } = monthRange(month);

  const [settings, { data }] = await Promise.all([
    getSettings(),
    createAdminClient()
      .from("orders")
      .select("date, variant, portion, price")
      .eq("employee_id", me.id)
      .gte("date", from)
      .lte("date", to)
      .order("date")
      .returns<Omit<Order, "employee_id">[]>(),
  ]);
  const orders = data ?? [];
  const totals = totalsFor(orders, settings.company_share);
  const money = (n: number) => `${n.toFixed(2)} ${t.order.lei}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.history.title}</h1>
        <MonthNav path="/history" month={month} locale={locale} />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label={`${t.history.full} / ${t.history.half}`} value={`${totals.full} / ${totals.half}`} />
        <Stat label={t.history.total} value={money(totals.total)} />
        <Stat label={fmt(t.history.company, { pct: Math.round(settings.company_share * 100) })} value={money(totals.company)} />
        <Stat label={t.history.deduction} value={money(totals.employee)} strong />
      </div>

      {orders.length === 0 ? (
        <p className="card text-muted">{t.history.empty}</p>
      ) : (
        <ul className="card divide-y divide-border p-0">
          {orders.map((o) => (
            <li key={o.date} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
              <span className="capitalize">{formatDay(o.date, locale, { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className="flex-1 text-muted">
                {o.variant} · {o.portion === "full" ? t.history.fullLunch : t.history.halfLunch}
              </span>
              <span className="tabular-nums">{Number(o.price).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="card flex flex-col gap-1 p-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={`tabular-nums ${strong ? "text-lg font-semibold" : "font-medium"}`}>{value}</span>
    </div>
  );
}
