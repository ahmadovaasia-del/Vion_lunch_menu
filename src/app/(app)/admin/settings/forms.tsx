"use client";

import { useTransition } from "react";
import { fmt, type Dictionary } from "@/i18n/dictionaries";
import type { Settings } from "@/lib/settings";
import { useFormAction } from "@/components/use-form-action";
import { addPrice, deletePrice, saveDispatchSettings } from "./actions";

export function PriceForm({ t, today }: { t: Dictionary; today: string }) {
  const [state, onSubmit, pending] = useFormAction(addPrice, (r) => r.ok);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 border-t border-border pt-3 sm:grid-cols-4 sm:items-end">
      <label className="flex flex-col gap-1">
        <span className="label">{t.settings.fullPrice}, {t.settings.lei}</span>
        <input name="full_price" required inputMode="decimal" className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.settings.halfPrice}, {t.settings.lei}</span>
        <input name="half_price" required inputMode="decimal" className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.settings.validFrom}</span>
        <input name="valid_from" type="date" required defaultValue={today} className="input" />
      </label>
      <button className="btn-primary" disabled={pending}>{t.settings.addPrice}</button>
      {state?.ok === false && <p className="alert-error sm:col-span-4">{state.error}</p>}
    </form>
  );
}

export function DeletePriceButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      className="btn-link"
      disabled={pending}
      onClick={() => confirm(`${label}?`) && start(() => deletePrice(id))}
    >
      {label}
    </button>
  );
}

function settingsError(t: Dictionary, error: string) {
  if (error.startsWith("badEmail:")) return fmt(t.settings.badEmail, { email: error.slice(9) });
  return (t.settings as Record<string, string>)[error] ?? error;
}

export function DispatchSettingsForm({ t, settings }: { t: Dictionary; settings: Settings }) {
  const [state, onSubmit, pending] = useFormAction(saveDispatchSettings);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      <fieldset className="flex flex-col gap-2 sm:col-span-2">
        <legend className="label mb-1">{t.settings.sendMode}</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name="send_mode" value="admin" defaultChecked={settings.send_mode === "admin"} className="size-4 accent-[var(--accent)]" />
          {t.settings.modeAdmin}
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name="send_mode" value="supplier" defaultChecked={settings.send_mode === "supplier"} className="size-4 accent-[var(--accent)]" />
          {t.settings.modeSupplier}
        </label>
      </fieldset>
      <label className="flex flex-col gap-1">
        <span className="label">{t.settings.supplierEmail}</span>
        <input name="supplier_email" type="email" defaultValue={settings.supplier_email ?? ""} className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.settings.adminEmails}</span>
        <input name="admin_emails" defaultValue={settings.admin_emails.join(", ")} className="input" />
        <span className="text-xs text-muted">{t.settings.adminEmailsHint}</span>
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.settings.cutoffTime}</span>
        <input name="cutoff_time" type="time" required defaultValue={settings.cutoff_time.slice(0, 5)} className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.settings.sendTime}</span>
        <input name="send_time" type="time" required defaultValue={settings.send_time.slice(0, 5)} className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.settings.companyShare}</span>
        <input name="company_share" required inputMode="decimal" defaultValue={Math.round(settings.company_share * 1000) / 10} className="input" />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{t.common.save}</button>
        {state?.ok === true && <span className="alert-ok">{t.common.saved}</span>}
        {state?.ok === false && <span className="alert-error">{settingsError(t, state.error)}</span>}
      </div>
    </form>
  );
}
