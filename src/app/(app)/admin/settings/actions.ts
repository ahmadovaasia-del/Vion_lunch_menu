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

const emailSchema = z.email();
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export async function saveDispatchSettings(_prev: SettingsResult | null, form: FormData): Promise<SettingsResult> {
  await requireAdmin();
  const send_mode = form.get("send_mode") === "supplier" ? "supplier" : "admin";
  const supplier_email = String(form.get("supplier_email") ?? "").trim().toLowerCase() || null;
  const admin_emails = String(form.get("admin_emails") ?? "")
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const cutoff_time = String(form.get("cutoff_time") ?? "").slice(0, 5);
  const send_time = String(form.get("send_time") ?? "").slice(0, 5);
  const share = Number(String(form.get("company_share") ?? "").replace(",", "."));

  for (const email of [supplier_email, ...admin_emails]) {
    if (email && !emailSchema.safeParse(email).success) return { ok: false, error: `badEmail:${email}` };
  }
  if (send_mode === "supplier" && !supplier_email) return { ok: false, error: "supplierRequired" };
  if (!timeSchema.safeParse(cutoff_time).success || !timeSchema.safeParse(send_time).success) {
    return { ok: false, error: "bad_time" };
  }
  if (send_time < cutoff_time) return { ok: false, error: "sendAfterCutoff" };
  if (!(share >= 0 && share <= 100)) return { ok: false, error: "bad_share" };

  const { error } = await createAdminClient()
    .from("settings")
    .update({
      send_mode,
      supplier_email,
      admin_emails,
      cutoff_time,
      send_time,
      company_share: share / 100,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}
