import Link from "next/link";
import { addMonths, formatMonth } from "@/lib/dates";
import type { Locale } from "@/i18n/dictionaries";

export function MonthNav({ path, month, locale }: { path: string; month: string; locale: Locale }) {
  const link = (m: string, label: string) => (
    <Link href={`${path}?month=${m}`} className="btn-secondary px-3 py-1.5 text-sm" aria-label={m}>
      {label}
    </Link>
  );
  return (
    <div className="flex items-center gap-2">
      {link(addMonths(month, -1), "←")}
      <span className="min-w-36 text-center font-medium capitalize">{formatMonth(month, locale)}</span>
      {link(addMonths(month, 1), "→")}
    </div>
  );
}
