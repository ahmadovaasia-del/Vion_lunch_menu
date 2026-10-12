import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const dir = path.resolve(__dirname, "../supabase/migrations");
let db: PGlite;

beforeAll(async () => {
  db = new PGlite();
  for (const file of readdirSync(dir).sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }
});

describe("миграции", () => {
  it("создают строку настроек по умолчанию", async () => {
    const { rows } = await db.query<{ send_mode: string; cutoff_time: string }>("select send_mode, cutoff_time from settings");
    expect(rows).toEqual([{ send_mode: "admin", cutoff_time: "09:15:00" }]);
  });

  it("e-mail сотрудника уникален и только в нижнем регистре", async () => {
    await db.query("insert into employees (full_name, email) values ('A', 'a@x.md')");
    await expect(db.query("insert into employees (full_name, email) values ('B', 'a@x.md')")).rejects.toThrow();
    await expect(db.query("insert into employees (full_name, email) values ('C', 'C@x.md')")).rejects.toThrow();
  });

  it("один заказ на сотрудника в день", async () => {
    await db.query("insert into menu_days (date, soup_ru, main_a_ru, main_b_ru) values ('2026-10-13', 'Суп', 'A', 'B')");
    const { rows } = await db.query<{ id: string }>("select id from employees where email = 'a@x.md'");
    const ins = "insert into orders (employee_id, date, variant, portion, price) values ($1, '2026-10-13', 'A', 'full', 50)";
    await db.query(ins, [rows[0].id]);
    await expect(db.query(ins, [rows[0].id])).rejects.toThrow();
  });
});
