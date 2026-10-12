import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";
import { finishLogin } from "@/lib/auth";

// Ссылка из письма. Два варианта:
// - свой шаблон: {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
// - стандартный шаблон Supabase: возвращает сюда с ?code=... (открывать в том же браузере)
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get("token_hash");
  const code = params.get("code");
  const type = (params.get("type") ?? "email") as EmailOtpType;

  const auth = await createAuthClient();
  const result = tokenHash
    ? await auth.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await auth.auth.exchangeCodeForSession(code)
      : null;
  if (result && !result.error && result.data.user?.email) {
    await finishLogin(result.data.user.email);
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(new URL("/login?error=link", request.url));
}
