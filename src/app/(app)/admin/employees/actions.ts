"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { parseEmployeeRows, readFirstSheet } from "@/lib/employees-import";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const employeeSchema = z.object({
  id: z.uuid().optional(),
  full_name: z.string().trim().min(1),
  email: z.email().transform((e) => e.trim().toLowerCase()),
  phone: z.string().trim().transform((v) => v || null),
  department_id: z.string().transform((v) => v || null).pipe(z.uuid().nullable()),
  role: z.enum(["employee", "admin"]),
  is_active: z.boolean(),
  locale: z.enum(["ru", "ro"]),
});

export async function saveEmployee(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const parsed = employeeSchema.safeParse({
    id: form.get("id") || undefined,
    full_name: form.get("full_name"),
    email: form.get("email"),
    phone: form.get("phone") ?? "",
    department_id: form.get("department_id") ?? "",
    role: form.get("role"),
    is_active: form.get("is_active") === "on",
    locale: form.get("locale") ?? "ru",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { id, ...values } = parsed.data;

  if (id === me.id && (!values.is_active || values.role !== "admin")) {
    return { ok: false, error: "cannotDeactivateSelf" };
  }

  const db = createAdminClient();
  const { error } = id
    ? await db.from("employees").update({ ...values, updated_at: new Date().toISOString() }).eq("id", id)
    : await db.from("employees").insert(values);
  if (error) {
    return { ok: false, error: error.code === "23505" ? "emailTaken" : error.message };
  }
  revalidatePath("/admin/employees");
  return { ok: true };
}

export async function addDepartment(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { ok: false, error: "empty" };
  const { error } = await createAdminClient().from("departments").insert({ name });
  if (error && error.code !== "23505") return { ok: false, error: error.message };
  revalidatePath("/admin/employees");
  return { ok: true };
}

export type ImportResult =
  | { ok: true; created: number; updated: number; skipped: number }
  | { ok: false; error: string };

export async function importEmployees(_prev: ImportResult | null, form: FormData): Promise<ImportResult> {
  const me = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "no_file" };
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "file_too_large" };

  let parsed;
  try {
    parsed = parseEmployeeRows(await readFirstSheet(await file.arrayBuffer()));
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "bad_file" };
  }
  const { employees, skipped } = parsed;
  if (employees.length === 0) return { ok: true, created: 0, updated: 0, skipped };

  const db = createAdminClient();

  // Отделы: создаём недостающие по имени.
  const deptNames = [...new Set(employees.map((e) => e.department).filter((d): d is string => !!d))];
  if (deptNames.length) {
    const { error } = await db
      .from("departments")
      .upsert(deptNames.map((name) => ({ name })), { onConflict: "name", ignoreDuplicates: true });
    if (error) return { ok: false, error: error.message };
  }
  const { data: depts, error: deptError } = await db.from("departments").select("id, name");
  if (deptError) return { ok: false, error: deptError.message };
  const deptId = new Map(depts.map((d) => [d.name, d.id as string]));

  const { data: existing, error: existingError } = await db
    .from("employees")
    .select("email")
    .in("email", employees.map((e) => e.email));
  if (existingError) return { ok: false, error: existingError.message };
  const existingEmails = new Set(existing.map((e) => e.email as string));

  const rows = employees.map((e) => ({
    full_name: e.full_name,
    email: e.email,
    phone: e.phone,
    department_id: e.department ? deptId.get(e.department) ?? null : null,
    // Администратор не может отключить сам себя импортом.
    is_active: e.email === me.email ? true : e.is_active,
    updated_at: new Date().toISOString(),
  }));
  const { error } = await db.from("employees").upsert(rows, { onConflict: "email" });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/employees");
  const updated = rows.filter((r) => existingEmails.has(r.email)).length;
  return { ok: true, created: rows.length - updated, updated, skipped };
}
