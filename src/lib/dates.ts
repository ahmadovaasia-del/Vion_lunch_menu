// Даты храним как строки 'YYYY-MM-DD' (тип date в Postgres), время — по Кишинёву.

export const TIME_ZONE = "Europe/Chisinau";

const partsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** Текущая дата и минуты от полуночи по Кишинёву. */
export function chisinauNow(now: Date = new Date()): { date: string; minutes: number } {
  const p = Object.fromEntries(partsFormatter.formatToParts(now).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}

/** '09:15' или '09:15:00' → 555 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

const toUtc = (date: string) => new Date(`${date}T00:00:00Z`);
const fromUtc = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** 1 = понедельник … 7 = воскресенье */
export function isoWeekday(date: string): number {
  return toUtc(date).getUTCDay() || 7;
}

export function mondayOf(date: string): string {
  return addDays(date, 1 - isoWeekday(date));
}

/** Пн–Пт недели, начинающейся с monday. */
export function workWeek(monday: string): string[] {
  return [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
}

export function isValidDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && fromUtc(toUtc(value)) === value;
}

/** Первый и последний день месяца 'YYYY-MM'. */
export function monthRange(month: string): { from: string; to: string } {
  const from = `${month}-01`;
  const next = toUtc(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { from, to: addDays(fromUtc(next), -1) };
}

/** Можно ли ещё менять заказ на date: до cutoff в тот же день, будущие дни — всегда. */
export function isOrderOpen(date: string, cutoffTime: string, now: Date = new Date()): boolean {
  const today = chisinauNow(now);
  if (date > today.date) return true;
  if (date < today.date) return false;
  return today.minutes < timeToMinutes(cutoffTime);
}

export function formatDay(date: string, locale: "ru" | "ro", opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  return new Intl.DateTimeFormat(locale === "ro" ? "ro-MD" : "ru-RU", { ...opts, timeZone: "UTC" }).format(toUtc(date));
}
