import type { Locale } from "@/i18n/dictionaries";

export type DishKind = "soup" | "main_a" | "main_b";
export const DISH_KINDS: DishKind[] = ["soup", "main_a", "main_b"];

export type MenuDay = {
  date: string;
  soup_ru: string | null;
  soup_ro: string | null;
  main_a_ru: string | null;
  main_a_ro: string | null;
  main_b_ru: string | null;
  main_b_ro: string | null;
};

/** Название блюда на языке интерфейса, иначе на другом языке. */
export function dishName(day: MenuDay, kind: DishKind, locale: Locale): string {
  const other: Locale = locale === "ru" ? "ro" : "ru";
  return day[`${kind}_${locale}`] ?? day[`${kind}_${other}`] ?? "";
}

export type Price = { id: string; full_price: number; half_price: number; valid_from: string };

/** Цена, действующая на дату (prices — в любом порядке). */
export function priceOn(prices: Price[], date: string): Price | null {
  let best: Price | null = null;
  for (const p of prices) {
    if (p.valid_from <= date && (!best || p.valid_from > best.valid_from)) best = p;
  }
  return best;
}

export type WeekFormResult = {
  upserts: MenuDay[];
  deletes: string[];
  incomplete: string[];
};

/**
 * Разбирает форму недели (поля `${date}.${kind}_${lang}`).
 * Полностью пустой день удаляется, частично заполненный — ошибка.
 */
export function parseWeekForm(get: (name: string) => string, dates: string[]): WeekFormResult {
  const result: WeekFormResult = { upserts: [], deletes: [], incomplete: [] };
  for (const date of dates) {
    const v = (field: string) => get(`${date}.${field}`).trim() || null;
    const day: MenuDay = {
      date,
      soup_ru: v("soup_ru"),
      soup_ro: v("soup_ro"),
      main_a_ru: v("main_a_ru"),
      main_a_ro: v("main_a_ro"),
      main_b_ru: v("main_b_ru"),
      main_b_ro: v("main_b_ro"),
    };
    const filled = DISH_KINDS.map((k) => !!(day[`${k}_ru`] ?? day[`${k}_ro`]));
    if (filled.every((f) => !f)) result.deletes.push(date);
    else if (filled.every(Boolean)) result.upserts.push(day);
    else result.incomplete.push(date);
  }
  return result;
}
