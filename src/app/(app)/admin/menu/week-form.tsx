"use client";

import { useTransition } from "react";
import { useFormAction } from "@/components/use-form-action";
import { fmt, type Dictionary } from "@/i18n/dictionaries";
import { DISH_KINDS, type DishKind, type MenuDay } from "@/lib/menu";
import { copyPreviousWeek, saveWeekMenu } from "./actions";

type Day = { date: string; label: string; menu: MenuDay | null };

export function WeekMenuForm({ t, week, days }: { t: Dictionary; week: string; days: Day[] }) {
  const [state, onSubmit, pending] = useFormAction(saveWeekMenu);
  const [copying, startCopy] = useTransition();
  const dishLabel: Record<DishKind, string> = { soup: t.menu.soup, main_a: t.menu.mainA, main_b: t.menu.mainB };
  const labelOf = (date: string) => days.find((d) => d.date === date)?.label ?? date;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="week" value={week} />
      {/* key: после «скопировать» поля перерисуются с новыми значениями */}
      <div key={JSON.stringify(days.map((d) => d.menu))} className="flex flex-col gap-3">
      {days.map(({ date, label, menu }) => (
        <fieldset
          key={date}
          className={`card flex flex-col gap-3 ${state?.ok === false && state.incomplete.includes(date) ? "border-danger" : ""}`}
        >
          <legend className="px-1 font-semibold capitalize">{label}</legend>
          {DISH_KINDS.map((kind) => (
            <div key={kind} className="grid gap-2 sm:grid-cols-[8rem_1fr_1fr] sm:items-center">
              <span className="label">{dishLabel[kind]}</span>
              <input
                name={`${date}.${kind}_ru`}
                defaultValue={menu?.[`${kind}_ru`] ?? ""}
                placeholder={t.menu.nameRu}
                className="input"
              />
              <input
                name={`${date}.${kind}_ro`}
                defaultValue={menu?.[`${kind}_ro`] ?? ""}
                placeholder={t.menu.nameRo}
                className="input"
              />
            </div>
          ))}
        </fieldset>
      ))}
      </div>

      {state?.ok === false && (
        <div className="flex flex-col gap-1">
          {state.incomplete.map((d) => (
            <p key={d} className="alert-error">{fmt(t.menu.incomplete, { day: labelOf(d) })}</p>
          ))}
          {state.hasOrders.map((d) => (
            <p key={d} className="alert-error">{fmt(t.menu.dayHasOrders, { day: labelOf(d) })}</p>
          ))}
          {state.error && <p className="alert-error">{state.error}</p>}
        </div>
      )}

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-border bg-background/95 px-4 py-3">
        <button className="btn-primary" disabled={pending}>{t.common.save}</button>
        {state?.ok === true && <span className="alert-ok">{t.common.saved}</span>}
        <button
          type="button"
          className="btn-link"
          disabled={copying}
          onClick={() => startCopy(() => copyPreviousWeek(week))}
        >
          {t.menu.copyPrev}
        </button>
      </div>
    </form>
  );
}
