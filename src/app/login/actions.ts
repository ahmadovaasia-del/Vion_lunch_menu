"use server";

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

  const auth = await createAuthClient();
  const { error } = await auth.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
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
