"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { addDays, isValidDate, isoWeekday, workWeek } from "@/lib/dates";
import { parseWeekForm, type MenuDay } from "@/lib/menu";

export type MenuResult = { ok: true } | { ok: false; incomplete: string[]; hasOrders: string[]; error?: string };

export async function saveWeekMenu(_prev: MenuResult | null, form: FormData): Promise<MenuResult> {
  await requireAdmin();
  const week = String(form.get("week"));
  if (!isValidDate(week) || isoWeekday(week) !== 1) return { ok: false, incomplete: [], hasOrders: [], error: "bad_week" };

  const { upserts, deletes, incomplete } = parseWeekForm((n) => String(form.get(n) ?? ""), workWeek(week));
  if (incomplete.length) return { ok: false, incomplete, hasOrders: [] };

  const db = createAdminClient();
  let hasOrders: string[] = [];
  if (deletes.length) {
    const { data, error } = await db.from("orders").select("date").in("date", deletes);
    if (error) return { ok: false, incomplete: [], hasOrders: [], error: error.message };
    hasOrders = [...new Set(data.map((o) => o.date as string))].sort();
  }

  const now = new Date().toISOString();
  if (upserts.length) {
    const { error } = await db.from("menu_days").upsert(upserts.map((d) => ({ ...d, updated_at: now })));
    if (error) return { ok: false, incomplete: [], hasOrders, error: error.message };
  }
  const toDelete = deletes.filter((d) => !hasOrders.includes(d));
  if (toDelete.length) {
    const { error } = await db.from("menu_days").delete().in("date", toDelete);
    if (error) return { ok: false, incomplete: [], hasOrders, error: error.message };
  }

  revalidatePath("/admin/menu");
  revalidatePath("/");
  return hasOrders.length ? { ok: false, incomplete: [], hasOrders } : { ok: true };
}

/** Копирует меню прошлой недели в пустые дни этой недели. */
export async function copyPreviousWeek(week: string) {
  await requireAdmin();
  if (!isValidDate(week) || isoWeekday(week) !== 1) return;
  const db = createAdminClient();
  const prev = workWeek(addDays(week, -7));
  const [{ data: source }, { data: existing }] = await Promise.all([
    db.from("menu_days").select("date, soup_ru, soup_ro, main_a_ru, main_a_ro, main_b_ru, main_b_ro").in("date", prev).returns<MenuDay[]>(),
    db.from("menu_days").select("date").in("date", workWeek(week)),
  ]);
  const taken = new Set((existing ?? []).map((d) => d.date as string));
  const rows = (source ?? [])
    .map((d) => ({ ...d, date: addDays(d.date, 7) }))
    .filter((d) => !taken.has(d.date));
  if (rows.length) await db.from("menu_days").insert(rows);
  revalidatePath("/admin/menu");
}
