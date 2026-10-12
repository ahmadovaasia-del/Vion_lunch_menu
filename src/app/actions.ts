"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentEmployee } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { LOCALES, type Locale } from "@/i18n/dictionaries";
import { LOCALE_COOKIE } from "@/i18n/server";

export async function setLocale(locale: Locale) {
  if (!LOCALES.includes(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365 });

  const me = await getCurrentEmployee();
  if (me && me.locale !== locale) {
    await createAdminClient().from("employees").update({ locale }).eq("id", me.id);
  }
  revalidatePath("/", "layout");
}
