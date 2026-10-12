import { timeToMinutes } from "@/lib/dates";
import { dishName, type MenuDay } from "@/lib/menu";
import type { DaySummary } from "@/lib/orders";

export type Recipients = { to: string[]; cc: string[] };

/** Кому отправлять: только админам или поставщику + копия админам. */
export function resolveRecipients(
  mode: "admin" | "supplier",
  supplierEmail: string | null,
  adminEmails: string[],
): Recipients | null {
  const admins = [...new Set(adminEmails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
  if (mode === "supplier" && supplierEmail?.trim()) {
    return { to: [supplierEmail.trim().toLowerCase()], cc: admins };
  }
  return admins.length ? { to: admins, cc: [] } : null;
}

/** Пора ли автоматически отправлять сводку (вызывается cron'ом каждые 15 минут). */
export function isDispatchDue(nowMinutes: number, sendTime: string): boolean {
  return nowMinutes >= timeToMinutes(sendTime);
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Письмо со сводкой (на двух языках — поставщик может читать любой). */
export function buildSummaryEmail(date: string, menu: MenuDay, s: DaySummary) {
  const [y, m, d] = date.split("-");
  const dateText = `${d}.${m}.${y}`;
  const subject = `Заказ обедов / Comanda prânzurilor ${dateText}: ${s.total}`;

  const dish = (kind: "soup" | "main_a" | "main_b") => {
    const ru = dishName(menu, kind, "ru");
    const ro = dishName(menu, kind, "ro");
    return ru === ro ? ru : `${ru} / ${ro}`;
  };

  const rows: [string, number, number, number][] = [
    [`A — ${dish("main_a")}`, s.A.full, s.A.half, s.A.full + s.A.half],
    [`B — ${dish("main_b")}`, s.B.full, s.B.half, s.B.full + s.B.half],
  ];

  const td = 'style="padding:6px 10px;border:1px solid #ddd;text-align:right"';
  const tdl = 'style="padding:6px 10px;border:1px solid #ddd"';
  const html = `<div style="font-family:Arial,sans-serif;font-size:14px;color:#111">
<h2 style="margin:0 0 8px">Заказ обедов / Comanda prânzurilor — ${dateText}</h2>
<p style="margin:0 0 12px">Первое / Felul întâi: ${esc(dish("soup"))}</p>
<table style="border-collapse:collapse">
<tr><th ${tdl}>Вариант / Varianta</th><th ${td}>Целых (с первым)<br>Complete</th><th ${td}>Половин (без первого)<br>Jumătăți</th><th ${td}>Всего / Total</th></tr>
${rows.map(([name, f, h, t]) => `<tr><td ${tdl}>${esc(name)}</td><td ${td}>${f}</td><td ${td}>${h}</td><td ${td}>${t}</td></tr>`).join("\n")}
<tr style="font-weight:bold"><td ${tdl}>Итого / Total</td><td ${td}>${s.full}</td><td ${td}>${s.half}</td><td ${td}>${s.total}</td></tr>
</table>
<p style="margin:12px 0 0">Всего обедов / Total prânzuri: <b>${s.total}</b> (первых блюд / porții felul întâi: ${s.full})</p>
</div>`;

  const text = [
    `Заказ обедов / Comanda prânzurilor — ${dateText}`,
    `Первое / Felul întâi: ${dish("soup")}`,
    "",
    ...rows.map(([name, f, h, t]) => `${name}: целых/complete ${f}, половин/jumătăți ${h}, всего/total ${t}`),
    "",
    `Итого / Total: целых ${s.full}, половин ${s.half}, всего ${s.total}`,
  ].join("\n");

  return { subject, html, text };
}
