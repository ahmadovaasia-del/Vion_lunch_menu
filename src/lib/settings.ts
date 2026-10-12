import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

export type Settings = {
  send_mode: "admin" | "supplier";
  supplier_email: string | null;
  admin_emails: string[];
  cutoff_time: string; // 'HH:MM:SS'
  send_time: string;
  company_share: number;
};

export async function getSettings(): Promise<Settings> {
  const { data, error } = await createAdminClient().from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return { ...data, company_share: Number(data.company_share) } as Settings;
}
