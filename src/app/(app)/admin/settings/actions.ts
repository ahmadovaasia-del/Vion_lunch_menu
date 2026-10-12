"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { isValidDate } from "@/lib/dates";

export type SettingsResult = { ok: true } | { ok: false; error: string };

const money = z.coerce.number().min(0).max(100000);
const priceSchema = z.object({
  full_price: money,
  half_price: money,
  valid_from: z.string().refine(isValidDate),
});

export async function addPrice(_prev: SettingsResult | null, form: FormData): Promise<SettingsResult> {
  await requireAdmin();
  const parsed = priceSchema.safeParse({
    full_price: String(form.get("full_price")).replace(",", "."),
    half_price: String(form.get("half_price")).replace(",", "."),
    valid_from: form.get("valid_from"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const db = createAdminClient();
  const { error } = await db.from("prices").upsert(parsed.data, { onConflict: "valid_from" });
  if (error) return { ok: false, error: error.message };
  const { error: repriceError } = await db.rpc("reprice_orders", { p_from: parsed.data.valid_from });
  if (repriceError) return { ok: false, error: repriceError.message };

  revalidatePath("/admin", "layout");
  return { ok: true };
}

export async function deletePrice(id: string) {
  await requireAdmin();
  const db = createAdminClient();
  const { data } = await db.from("prices").delete().eq("id", id).select("valid_from").maybeSingle();
  if (data) await db.rpc("reprice_orders", { p_from: data.valid_from });
  revalidatePath("/admin", "layout");
}
