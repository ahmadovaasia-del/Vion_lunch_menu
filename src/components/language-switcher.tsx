"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/actions";
import { LOCALES, type Locale } from "@/i18n/dictionaries";

export function LanguageSwitcher({ locale }: { locale: Locale }) {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex overflow-hidden rounded-lg border border-border text-sm">
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => setLocale(l))}
          className={`px-2.5 py-1 uppercase ${l === locale ? "bg-accent text-accent-fg" : ""}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
