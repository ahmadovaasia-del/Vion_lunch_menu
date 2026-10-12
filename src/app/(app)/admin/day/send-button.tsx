"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { DispatchStatus } from "@/lib/dispatch-run";
import { sendSummaryNow } from "./actions";

export function SendSummaryButton({ t, date, alreadySent }: { t: Dictionary["day"]; date: string; alreadySent: boolean }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<DispatchStatus | null>(null);
  const label = alreadySent ? t.resend : t.sendNow;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="btn-secondary"
        disabled={pending}
        onClick={() => confirm(`${label}?`) && start(async () => setResult(await sendSummaryNow(date)))}
      >
        {label}
      </button>
      {result && (
        <span className={result === "sent" ? "alert-ok" : "alert-error"}>
          {(t as Record<string, string>)[`sendResult_${result}`] ?? result}
        </span>
      )}
    </div>
  );
}
