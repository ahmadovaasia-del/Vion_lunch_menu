"use server";

import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { createAuthClient } from "@/lib/supabase/server";
import { finishLogin } from "@/lib/auth";

const OTP_TYPES: EmailOtpType[] = ["email", "magiclink", "signup", "invite"];

export async function confirmLink(form: FormData) {
  const tokenHash = String(form.get("token_hash") ?? "");
  const code = String(form.get("code") ?? "");
  const rawType = String(form.get("type") ?? "email") as EmailOtpType;
  const type = OTP_TYPES.includes(rawType) ? rawType : "email";

  const auth = await createAuthClient();
  const result = tokenHash
    ? await auth.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await auth.auth.exchangeCodeForSession(code)
      : null;

  if (!result || result.error || !result.data.user?.email) redirect("/login?error=link");
  await finishLogin(result.data.user.email);
  redirect("/");
}
