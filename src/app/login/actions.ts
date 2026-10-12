"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { findActiveEmployeeByEmail, finishLogin, normalizeEmail } from "@/lib/auth";
import { createAuthClient } from "@/lib/supabase/server";

export type LoginState =
  | { step: "email"; error?: "unknownEmail" | "sendFailed" }
  | { step: "code"; email: string; error?: "invalidCode" };

export async function requestCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  if (!email.includes("@") || !(await findActiveEmployeeByEmail(email))) {
    return { step: "email", error: "unknownEmail" };
  }

  // Куда вернёт ссылка из стандартного письма Supabase (?code=...).
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("x-forwarded-host") ?? h.get("host")}`;

  const auth = await createAuthClient();
  const { error } = await auth.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) {
    console.error("signInWithOtp", error.message);
    return { step: "email", error: "sendFailed" };
  }
  return { step: "code", email };
}

export async function verifyCode(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(form.get("email") ?? ""));
  const token = String(form.get("code") ?? "").replace(/\s/g, "");

  const auth = await createAuthClient();
  const { error } = await auth.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { step: "code", email, error: "invalidCode" };

  await finishLogin(email);
  redirect("/");
}

export async function logout() {
  const auth = await createAuthClient();
  await auth.auth.signOut();
  redirect("/login");
}
