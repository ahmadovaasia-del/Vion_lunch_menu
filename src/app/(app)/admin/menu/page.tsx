import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { addDays, chisinauNow, formatDay, isValidDate, mondayOf, workWeek } from "@/lib/dates";
import type { MenuDay } from "@/lib/menu";
import { WeekMenuForm } from "./week-form";

export default async function MenuPage({ searchParams }: PageProps<"/admin/menu">) {
  const { locale, t } = await getDict();
  const { week: weekParam } = await searchParams;
  const today = chisinauNow().date;
  const week = mondayOf(isValidDate(weekParam) ? weekParam : today);
  const dates = workWeek(week);

  const db = createAdminClient();
  const [{ data: days }, { count: priceCount }] = await Promise.all([
    db.from("menu_days").select("*").in("date", dates).returns<MenuDay[]>(),
    db.from("prices").select("id", { count: "exact", head: true }),
  ]);
  const byDate = new Map((days ?? []).map((d) => [d.date, d]));

  const nav = (w: string, label: string) => (
    <Link href={`/admin/menu?week=${w}`} className="btn-secondary px-3 py-1.5 text-sm">{label}</Link>
  );

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t.menu.title}</h1>
      <div className="flex flex-wrap items-center gap-2">
        {nav(addDays(week, -7), t.menu.prevWeek)}
        {nav(mondayOf(today), t.menu.thisWeek)}
        {nav(addDays(week, 7), t.menu.nextWeek)}
        <span className="text-sm text-muted">
          {formatDay(dates[0], locale, { day: "numeric", month: "long" })} — {formatDay(dates[4], locale, { day: "numeric", month: "long", year: "numeric" })}
        </span>
      </div>
      {!priceCount && <p className="alert-error">{t.menu.noPrice}</p>}
      <p className="text-sm text-muted">{t.menu.emptyDayHint}</p>
      <WeekMenuForm
        t={t}
        week={week}
        days={dates.map((date) => ({ date, label: formatDay(date, locale), menu: byDate.get(date) ?? null }))}
      />
    </div>
  );
}
