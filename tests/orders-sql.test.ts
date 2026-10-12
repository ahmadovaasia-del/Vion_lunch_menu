import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeEach, describe, expect, it } from "vitest";

const dir = path.resolve(__dirname, "../supabase/migrations");
let db: PGlite;
let emp: string;
let admin: string;

beforeEach(async () => {
  db = new PGlite();
  for (const file of readdirSync(dir).sort()) await db.exec(readFileSync(path.join(dir, file), "utf8"));
  await db.exec(`
    insert into prices (full_price, half_price, valid_from) values (60, 40, '2026-01-01');
    insert into menu_days (date, soup_ru, main_a_ru, main_b_ro) values
      ('2026-10-13', 'Борщ', 'Котлета', 'Pește'), ('2026-10-20', 'Суп', 'Плов', 'Paste');
  `);
  emp = (await db.query<{ id: string }>("insert into employees (full_name, email) values ('Иван', 'i@x.md') returning id")).rows[0].id;
  admin = (await db.query<{ id: string }>("insert into employees (full_name, email, role) values ('Админ', 'a@x.md', 'admin') returning id")).rows[0].id;
});

const setOrder = (variant: string | null, portion: string | null, actor: string, date = "2026-10-13") =>
  db.query("select set_order($1, $2, $3, $4, $5)", [emp, date, variant, portion, actor]);
const order = async (date = "2026-10-13") =>
  (await db.query<{ variant: string; portion: string; price: string }>(
    "select variant, portion, price from orders where employee_id = $1 and date = $2", [emp, date])).rows[0];
const changes = async () => (await db.query<{ old_value: string | null; new_value: string | null }>(
  "select old_value, new_value from order_changes order by changed_at")).rows;

describe("set_order", () => {
  it("создаёт, меняет и снимает заказ с ценой на дату", async () => {
    await setOrder("A", "full", emp);
    expect(await order()).toEqual({ variant: "A", portion: "full", price: "60.00" });
    await setOrder("B", "half", emp);
    expect(await order()).toEqual({ variant: "B", portion: "half", price: "40.00" });
    await setOrder(null, null, emp);
    expect(await order()).toBeUndefined();
    expect(await changes()).toEqual([]); // сам сотрудник — без журнала
  });

  it("правки админа попадают в журнал", async () => {
    await setOrder("A", "full", emp);
    await setOrder("B", "full", admin);
    await setOrder(null, null, admin);
    expect(await changes()).toEqual([
      { old_value: "A/full", new_value: "B/full" },
      { old_value: "B/full", new_value: null },
    ]);
  });

  it("нельзя заказать без цены или без меню", async () => {
    await db.exec("delete from prices");
    await expect(setOrder("A", "full", emp)).rejects.toThrow("no_price");
    await db.exec("insert into prices (full_price, half_price, valid_from) values (60, 40, '2026-01-01')");
    await expect(setOrder("A", "full", emp, "2026-10-14")).rejects.toThrow();
  });
});

describe("цены", () => {
  it("новая цена с даты пересчитывает только заказы с этой даты", async () => {
    await setOrder("A", "full", emp, "2026-10-13");
    await setOrder("A", "half", emp, "2026-10-20");
    await db.exec("insert into prices (full_price, half_price, valid_from) values (70, 45, '2026-10-19')");
    const n = (await db.query<{ n: number }>("select reprice_orders('2026-10-19') as n")).rows[0].n;
    expect(n).toBe(1);
    expect((await order("2026-10-13")).price).toBe("60.00");
    expect((await order("2026-10-20")).price).toBe("45.00");
  });

  it("меню требует название хотя бы на одном языке", async () => {
    await expect(db.exec("insert into menu_days (date, soup_ro, main_a_ru) values ('2026-10-21', 'Supă', 'A')")).rejects.toThrow();
  });
});
