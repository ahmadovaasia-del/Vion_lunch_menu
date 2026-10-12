import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { sendMail } from "@/lib/mail";
import { getSettings } from "@/lib/settings";
import { chisinauNow } from "@/lib/dates";
import { buildSummaryEmail, isDispatchDue, resolveRecipients } from "@/lib/dispatch";
import { summarize, type Choice } from "@/lib/orders";
import type { MenuDay } from "@/lib/menu";

export type DispatchStatus = "sent" | "already_sent" | "not_due" | "no_menu" | "no_recipients" | "send_failed";

/**
 * Отправляет сводку на дату. Без force — только если наступило время отправки
 * и сегодня ещё не отправляли (повторные вызовы cron'а безопасны).
 * force — ручная (повторная) отправка админом.
 */
export async function runDailyDispatch({ date, force = false }: { date?: string; force?: boolean } = {}): Promise<{
  status: DispatchStatus;
  date: string;
  error?: string;
}> {
  const now = chisinauNow();
  const day = date ?? now.date;
  const settings = await getSettings();
  if (!force && !isDispatchDue(now.minutes, settings.send_time)) return { status: "not_due", date: day };

  const db = createAdminClient();
  const { data: menu } = await db.from("menu_days").select("*").eq("date", day).maybeSingle<MenuDay>();
  if (!menu) return { status: "no_menu", date: day };

  let adminEmails = settings.admin_emails;
  if (!adminEmails.length) {
    const { data } = await db.from("employees").select("email").eq("role", "admin").eq("is_active", true);
    adminEmails = (data ?? []).map((e) => e.email as string);
  }
  const recipients = resolveRecipients(settings.send_mode, settings.supplier_email, adminEmails);
  if (!recipients) return { status: "no_recipients", date: day };

  const { data: orders, error: ordersError } = await db.from("orders").select("variant, portion").eq("date", day).returns<Choice[]>();
  if (ordersError) throw ordersError;
  const summary = summarize(orders ?? []);

  // Сначала «занимаем» день, чтобы два одновременных вызова не отправили дважды.
  const row = { date: day, sent_at: new Date().toISOString(), recipients: [...recipients.to, ...recipients.cc], payload: summary };
  if (force) {
    const { error } = await db.from("daily_dispatches").upsert(row);
    if (error) throw error;
  } else {
    const { error } = await db.from("daily_dispatches").insert(row);
    if (error?.code === "23505") return { status: "already_sent", date: day };
    if (error) throw error;
  }

  const mail = buildSummaryEmail(day, menu, summary);
  try {
    await sendMail({ to: recipients.to, cc: recipients.cc, ...mail });
  } catch (sendError) {
    // Освобождаем день, чтобы следующий запуск cron'а попробовал снова.
    await db.from("daily_dispatches").delete().eq("date", day);
    console.error("daily dispatch send failed", sendError);
    return { status: "send_failed", date: day, error: sendError instanceof Error ? sendError.message : String(sendError) };
  }
  return { status: "sent", date: day };
}
