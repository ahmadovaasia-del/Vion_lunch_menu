import { describe, expect, it } from "vitest";
import { dishName, parseWeekForm, priceOn, type MenuDay, type Price } from "@/lib/menu";

describe("parseWeekForm", () => {
  it("заполненный день — upsert, пустой — delete, частичный — ошибка", () => {
    const form: Record<string, string> = {
      "2026-10-12.soup_ru": "Борщ",
      "2026-10-12.main_a_ro": "Pui",
      "2026-10-12.main_b_ru": " Рыба ",
      "2026-10-13.soup_ru": "Суп",
    };
    const r = parseWeekForm((n) => form[n] ?? "", ["2026-10-12", "2026-10-13", "2026-10-14"]);
    expect(r.upserts).toEqual([
      { date: "2026-10-12", soup_ru: "Борщ", soup_ro: null, main_a_ru: null, main_a_ro: "Pui", main_b_ru: "Рыба", main_b_ro: null },
    ]);
    expect(r.incomplete).toEqual(["2026-10-13"]);
    expect(r.deletes).toEqual(["2026-10-14"]);
  });
});

describe("dishName", () => {
  const day: MenuDay = { date: "2026-10-12", soup_ru: "Борщ", soup_ro: "Borș", main_a_ru: "Котлета", main_a_ro: null, main_b_ru: null, main_b_ro: "Pește" };
  it("язык интерфейса, иначе другой", () => {
    expect(dishName(day, "soup", "ro")).toBe("Borș");
    expect(dishName(day, "main_a", "ro")).toBe("Котлета");
    expect(dishName(day, "main_b", "ru")).toBe("Pește");
  });
});

describe("priceOn", () => {
  const prices: Price[] = [
    { id: "2", full_price: 70, half_price: 45, valid_from: "2026-11-01" },
    { id: "1", full_price: 60, half_price: 40, valid_from: "2026-01-01" },
  ];
  it("последняя цена не позже даты", () => {
    expect(priceOn(prices, "2025-12-31")).toBeNull();
    expect(priceOn(prices, "2026-10-31")?.id).toBe("1");
    expect(priceOn(prices, "2026-11-01")?.id).toBe("2");
  });
});
