import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { runDailyDispatch } from "@/lib/dispatch-run";

// Вызывается pg_cron'ом Supabase каждые 15 минут утром по будням
// (см. supabase/cron.sql). Решение «пора ли отправлять» принимает runDailyDispatch.
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!secret || given.length !== expected.length || !timingSafeEqual(Buffer.from(given), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDailyDispatch();
    return NextResponse.json(result, { status: result.status === "send_failed" ? 502 : 200 });
  } catch (e) {
    console.error("daily-summary", e);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

export const GET = POST;
