import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { finishLogin } from "@/lib/auth";

// Ссылка из письма: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = (request.nextUrl.searchParams.get("type") ?? "email") as EmailOtpType;

  if (tokenHash) {
    const auth = await createAuthClient();
    const { data, error } = await auth.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error && data.user?.email) {
      await finishLogin(data.user.email);
      return NextResponse.redirect(new URL("/", request.url));
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
