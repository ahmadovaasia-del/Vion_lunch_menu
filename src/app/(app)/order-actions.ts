"use server";

import { revalidatePath } from "next/cache";
import { requireEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { getSettings } from "@/lib/settings";
import { isOrderOpen, isValidDate } from "@/lib/dates";
import { isChoice, type Choice } from "@/lib/orders";

export type OrderResult = { ok: true } | { ok: false; error: "lockedError" | "noPrice" | "noMenu" | "saveFailed" };

/**
 * Поставить/снять заказ. Без employeeId — свой заказ (действует блокировка 9:15).
 * С employeeId — правка админом (без блокировки, пишется в журнал).
 */
export async function setOrder(date: string, choice: Choice | null, employeeId?: string): Promise<OrderResult> {
  const me = await requireEmployee();
  if (!isValidDate(date) || (choice !== null && !isChoice(choice))) return { ok: false, error: "saveFailed" };

  const asAdmin = employeeId !== undefined;
  if (asAdmin && me.role !== "admin") return { ok: false, error: "saveFailed" };

  if (!asAdmin) {
    const { cutoff_time } = await getSettings();
    if (!isOrderOpen(date, cutoff_time)) return { ok: false, error: "lockedError" };
  }

  const { error } = await createAdminClient().rpc("set_order", {
    p_employee: employeeId ?? me.id,
    p_date: date,
    p_variant: choice?.variant ?? null,
    p_portion: choice?.portion ?? null,
    p_actor: me.id,
  });
  if (error) {
    if (error.message.includes("no_price")) return { ok: false, error: "noPrice" };
    if (error.code === "23503") return { ok: false, error: "noMenu" };
    console.error("set_order", error);
    return { ok: false, error: "saveFailed" };
  }

  revalidatePath(asAdmin ? "/admin/day" : "/");
  return { ok: true };
}
