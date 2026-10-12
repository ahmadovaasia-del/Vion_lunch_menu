import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { LOCALE_COOKIE } from "@/i18n/server";
import { createAdminClient, createAuthClient } from "@/lib/supabase/server";
import type { Employee } from "@/lib/types";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * Активный сотрудник с таким e-mail. Если сотрудника нет, но e-mail совпадает
 * с BOOTSTRAP_ADMIN_EMAIL, создаёт первого администратора.
 */
export async function findActiveEmployeeByEmail(rawEmail: string): Promise<Employee | null> {
  const email = normalizeEmail(rawEmail);
  const db = createAdminClient();
  const { data, error } = await db
    .from("employees")
    .select("*")
    .eq("email", email) // e-mail всегда хранится в нижнем регистре
    .maybeSingle<Employee>();
  if (error) throw error;
  if (data) return data.is_active ? data : null;

  const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (bootstrap && normalizeEmail(bootstrap) === email) {
    const { data: created, error: insertError } = await db
      .from("employees")
      .insert({ full_name: "Администратор", email, role: "admin" })
      .select("*")
      .single<Employee>();
    if (insertError) throw insertError;
    return created;
  }
  return null;
}

/** Текущий сотрудник (или null), один запрос к базе на рендер. */
export const getCurrentEmployee = cache(async (): Promise<Employee | null> => {
  const auth = await createAuthClient();
  const {
    data: { user },
  } = await auth.auth.getUser();
  if (!user?.email) return null;
  return findActiveEmployeeByEmail(user.email);
});

export async function requireEmployee(): Promise<Employee> {
  const me = await getCurrentEmployee();
  if (!me) redirect("/login");
  return me;
}

export async function requireAdmin(): Promise<Employee> {
  const me = await requireEmployee();
  if (me.role !== "admin") redirect("/");
  return me;
}

/** После успешного входа: язык интерфейса берётся из профиля сотрудника. */
export async function finishLogin(email: string) {
  const me = await findActiveEmployeeByEmail(email);
  if (me) {
    (await cookies()).set(LOCALE_COOKIE, me.locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  }
}
