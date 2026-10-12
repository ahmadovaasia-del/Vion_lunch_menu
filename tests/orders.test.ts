import { describe, expect, it } from "vitest";
import { isChoice, splitAmount, summarize, totalsFor } from "@/lib/orders";

describe("summarize", () => {
  it("считает целые и половины по вариантам", () => {
    const s = summarize([
      { variant: "A", portion: "full" },
      { variant: "A", portion: "half" },
      { variant: "A", portion: "full" },
      { variant: "B", portion: "half" },
    ]);
    expect(s).toEqual({ A: { full: 2, half: 1 }, B: { full: 0, half: 1 }, full: 2, half: 2, total: 4 });
  });
});

describe("деньги 50/50", () => {
  it("делит пополам", () => {
    expect(splitAmount(310, 0.5)).toEqual({ total: 310, company: 155, employee: 155 });
  });
  it("нечётные бани: компания + сотрудник = итог", () => {
    const s = splitAmount(60.05, 0.5);
    expect(s.total).toBe(60.05);
    expect(Math.abs(s.company - 30.025)).toBeLessThanOrEqual(0.005 + 1e-9);
    expect(Math.round((s.company + s.employee) * 100)).toBe(6005);
  });
  it("итоги сотрудника (цены из базы приходят строками)", () => {
    const t = totalsFor(
      [
        { portion: "full", price: "60.00" },
        { portion: "half", price: "40.00" },
        { portion: "full", price: 60 },
      ],
      0.5,
    );
    expect(t).toEqual({ full: 2, half: 1, total: 160, company: 80, employee: 80 });
  });
});

describe("isChoice", () => {
  it("валидирует ввод", () => {
    expect(isChoice({ variant: "A", portion: "half" })).toBe(true);
    expect(isChoice({ variant: "C", portion: "half" })).toBe(false);
    expect(isChoice(null)).toBe(false);
  });
});
