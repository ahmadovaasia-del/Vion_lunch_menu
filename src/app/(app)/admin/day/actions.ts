"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { isValidDate } from "@/lib/dates";
import { runDailyDispatch, type DispatchStatus } from "@/lib/dispatch-run";

export async function sendSummaryNow(date: string): Promise<DispatchStatus> {
  await requireAdmin();
  if (!isValidDate(date)) return "no_menu";
  const { status } = await runDailyDispatch({ date, force: true });
  revalidatePath("/admin/day");
  return status;
}
