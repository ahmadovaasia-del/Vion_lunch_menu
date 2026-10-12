import { describe, expect, it } from "vitest";
import { buildSummaryEmail, isDispatchDue, resolveRecipients } from "@/lib/dispatch";
import { summarize } from "@/lib/orders";

describe("resolveRecipients", () => {
  it("режим «только админу»", () => {
    expect(resolveRecipients("admin", "sup@food.md", ["Boss@firm.md", "boss@firm.md", " "])).toEqual({ to: ["boss@firm.md"], cc: [] });
  });
  it("поставщику + копия админу", () => {
    expect(resolveRecipients("supplier", "Sup@food.md", ["a@firm.md"])).toEqual({ to: ["sup@food.md"], cc: ["a@firm.md"] });
  });
  it("поставщик не указан — уходит админу; нет никого — null", () => {
    expect(resolveRecipients("supplier", "", ["a@firm.md"])).toEqual({ to: ["a@firm.md"], cc: [] });
    expect(resolveRecipients("admin", null, [])).toBeNull();
  });
});

describe("isDispatchDue", () => {
  it("с 9:30 и позже", () => {
    expect(isDispatchDue(9 * 60 + 29, "09:30:00")).toBe(false);
    expect(isDispatchDue(9 * 60 + 30, "09:30:00")).toBe(true);
    expect(isDispatchDue(10 * 60 + 45, "09:30")).toBe(true);
  });
});

describe("buildSummaryEmail", () => {
  it("содержит количества по вариантам и итог, экранирует HTML", () => {
    const s = summarize([
      { variant: "A", portion: "full" },
      { variant: "A", portion: "half" },
      { variant: "B", portion: "full" },
    ]);
    const mail = buildSummaryEmail(
      "2026-10-13",
      { date: "2026-10-13", soup_ru: "Борщ", soup_ro: "Borș", main_a_ru: "Котлета <по-киевски>", main_a_ro: null, main_b_ru: "Рыба", main_b_ro: "Pește" },
      s,
    );
    expect(mail.subject).toBe("Заказ обедов / Comanda prânzurilor 13.10.2026: 3");
    expect(mail.html).toContain("Котлета &lt;по-киевски&gt;");
    expect(mail.html).not.toContain("<по-киевски>");
    expect(mail.text).toContain("A — Котлета <по-киевски>: целых/complete 1, половин/jumătăți 1, всего/total 2");
    expect(mail.text).toContain("B — Рыба / Pește: целых/complete 1, половин/jumătăți 0, всего/total 1");
    expect(mail.text).toContain("Итого / Total: целых 2, половин 1, всего 3");
  });
});
