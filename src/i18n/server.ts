import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALES, dictionaries, type Locale } from "./dictionaries";

export const LOCALE_COOKIE = "lang";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return LOCALES.includes(value as Locale) ? (value as Locale) : DEFAULT_LOCALE;
}

export async function getDict() {
  const locale = await getLocale();
  return { locale, t: dictionaries[locale] };
}
