export type Variant = "A" | "B";
export type Portion = "full" | "half";
export type Choice = { variant: Variant; portion: Portion };

export type Order = Choice & { employee_id: string; date: string; price: number | string };

export function isChoice(v: unknown): v is Choice {
  if (!v || typeof v !== "object") return false;
  const c = v as Record<string, unknown>;
  return (c.variant === "A" || c.variant === "B") && (c.portion === "full" || c.portion === "half");
}

export type DaySummary = {
  A: { full: number; half: number };
  B: { full: number; half: number };
  full: number;
  half: number;
  total: number;
};

/** Количество целых/половинных обедов по вариантам. */
export function summarize(orders: Choice[]): DaySummary {
  const s: DaySummary = { A: { full: 0, half: 0 }, B: { full: 0, half: 0 }, full: 0, half: 0, total: 0 };
  for (const o of orders) {
    s[o.variant][o.portion]++;
    s[o.portion]++;
    s.total++;
  }
  return s;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export type MoneySplit = { total: number; company: number; employee: number };

/** Делит сумму: доля компании округляется до бань, остаток — удержание с сотрудника. */
export function splitAmount(total: number, companyShare: number): MoneySplit {
  const t = round2(total);
  const company = round2(t * companyShare);
  return { total: t, company, employee: round2(t - company) };
}

export type EmployeeTotals = { full: number; half: number } & MoneySplit;

export function totalsFor(orders: Pick<Order, "portion" | "price">[], companyShare: number): EmployeeTotals {
  let full = 0;
  let half = 0;
  let sum = 0;
  for (const o of orders) {
    if (o.portion === "full") full++;
    else half++;
    sum += Number(o.price);
  }
  return { full, half, ...splitAmount(sum, companyShare) };
}
