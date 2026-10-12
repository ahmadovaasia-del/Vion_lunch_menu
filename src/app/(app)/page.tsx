import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/dictionaries";
import { addDays, chisinauNow, formatDay, isOrderOpen, isValidDate, mondayOf, workWeek } from "@/lib/dates";
import { dishName, priceOn, type MenuDay, type Price } from "@/lib/menu";
import type { Choice } from "@/lib/orders";
import { ChoicePicker } from "@/components/choice-picker";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const me = await requireEmployee();
  const { locale, t } = await getDict();
  const { week: weekParam } = await searchParams;
  const today = chisinauNow().date;
  const week = mondayOf(isValidDate(weekParam) ? weekParam : today);
  const dates = workWeek(week);

  const db = createAdminClient();
  const [settings, { data: menus }, { data: orders }, { data: prices }] = await Promise.all([
    getSettings(),
    db.from("menu_days").select("*").in("date", dates).order("date").returns<MenuDay[]>(),
    db.from("orders").select("date, variant, portion").eq("employee_id", me.id).in("date", dates).returns<(Choice & { date: string })[]>(),
    db.from("prices").select("*").returns<Price[]>(),
  ]);
  const orderByDate = new Map((orders ?? []).map((o) => [o.date, { variant: o.variant, portion: o.portion }]));
  const menuByDate = new Map((menus ?? []).map((m) => [m.date, m]));
  const cutoff = settings.cutoff_time.slice(0, 5);

  const nav = (w: string, label: string) => (
    <Link href={`/?week=${w}`} className="btn-secondary px-3 py-1.5 text-sm">{label}</Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.order.title}</h1>
        <Link href="/history" className="btn-link">{t.nav.history}</Link>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {nav(addDays(week, -7), t.menu.prevWeek)}
        {nav(mondayOf(today), t.menu.thisWeek)}
        {nav(addDays(week, 7), t.menu.nextWeek)}
      </div>
      <p className="text-sm text-muted">{fmt(t.order.lockHint, { time: cutoff })}</p>

      {!menus?.length && <p className="card text-muted">{t.order.noMenuWeek}</p>}

      <ul className="flex flex-col gap-3">
        {dates.map((date) => {
          const menu = menuByDate.get(date);
          if (!menu) {
            return menus?.length ? (
              <li key={date} className="card flex items-center justify-between text-sm text-muted">
                <span className="capitalize">{formatDay(date, locale)}</span>
                <span>{t.order.noMenu}</span>
              </li>
            ) : null;
          }
          const locked = !isOrderOpen(date, settings.cutoff_time);
          const price = priceOn(prices ?? [], date);
          return (
            <li
              key={date}
              className={`card flex flex-col gap-3 ${date === today ? "ring-2 ring-accent/40" : ""} ${locked ? "bg-background" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-semibold capitalize">{formatDay(date, locale)}</h2>
                {locked && <span className="text-xs text-muted">🔒 {t.order.locked}</span>}
              </div>
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-muted">{t.menu.soup}</dt>
                <dd>{dishName(menu, "soup", locale)}</dd>
                <dt className="font-semibold">A</dt>
                <dd>{dishName(menu, "main_a", locale)}</dd>
                <dt className="font-semibold">B</dt>
                <dd>{dishName(menu, "main_b", locale)}</dd>
              </dl>
              <ChoicePicker
                t={t.order}
                date={date}
                initial={orderByDate.get(date) ?? null}
                locked={locked}
                prices={price ? { full: Number(price.full_price), half: Number(price.half_price) } : null}
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
