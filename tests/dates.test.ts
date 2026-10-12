import { describe, expect, it } from "vitest";
import { addDays, chisinauNow, isOrderOpen, isValidDate, mondayOf, monthRange, workWeek } from "@/lib/dates";

describe("chisinauNow", () => {
  it("летнее время UTC+3", () => {
    expect(chisinauNow(new Date("2026-07-15T06:14:00Z"))).toEqual({ date: "2026-07-15", minutes: 9 * 60 + 14 });
  });
  it("зимнее время UTC+2", () => {
    expect(chisinauNow(new Date("2026-12-15T07:14:00Z"))).toEqual({ date: "2026-12-15", minutes: 9 * 60 + 14 });
  });
  it("полночь по Кишинёву — уже следующий день, хотя в UTC ещё предыдущий", () => {
    expect(chisinauNow(new Date("2026-10-12T21:30:00Z")).date).toBe("2026-10-13");
  });
});

describe("isOrderOpen (блокировка в 9:15)", () => {
  const cutoff = "09:15:00";
  it("сегодня до 9:15 — открыт, в 9:15 и позже — закрыт (лето)", () => {
    expect(isOrderOpen("2026-07-15", cutoff, new Date("2026-07-15T06:14:59Z"))).toBe(true);
    expect(isOrderOpen("2026-07-15", cutoff, new Date("2026-07-15T06:15:00Z"))).toBe(false);
  });
  it("то же зимой (UTC+2)", () => {
    expect(isOrderOpen("2026-12-15", cutoff, new Date("2026-12-15T07:14:00Z"))).toBe(true);
    expect(isOrderOpen("2026-12-15", cutoff, new Date("2026-12-15T07:15:00Z"))).toBe(false);
  });
  it("будущие дни открыты, прошедшие закрыты", () => {
    const now = new Date("2026-10-13T10:00:00Z");
    expect(isOrderOpen("2026-10-14", cutoff, now)).toBe(true);
    expect(isOrderOpen("2026-10-12", cutoff, now)).toBe(false);
  });
  it("в день перехода на летнее время (29.03.2026)", () => {
    expect(isOrderOpen("2026-03-30", cutoff, new Date("2026-03-30T06:14:00Z"))).toBe(true);
    expect(isOrderOpen("2026-03-30", cutoff, new Date("2026-03-30T06:16:00Z"))).toBe(false);
  });
});

describe("календарь", () => {
  it("неделя Пн–Пт", () => {
    expect(mondayOf("2026-10-18")).toBe("2026-10-12");
    expect(mondayOf("2026-10-12")).toBe("2026-10-12");
    expect(workWeek("2026-12-28")).toEqual(["2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", "2027-01-01"]);
  });
  it("addDays и monthRange", () => {
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
    expect(monthRange("2028-02")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
    expect(monthRange("2026-12")).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  });
  it("isValidDate", () => {
    expect(isValidDate("2026-10-12")).toBe(true);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("12.10.2026")).toBe(false);
  });
});

describe("месяцы", () => {
  it("addMonths через границу года", async () => {
    const { addMonths, isValidMonth } = await import("@/lib/dates");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(isValidMonth("2026-13")).toBe(false);
    expect(isValidMonth("2026-10")).toBe(true);
  });
});
