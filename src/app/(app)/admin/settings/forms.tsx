"use client";

import { useTransition } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { useFormAction } from "@/components/use-form-action";
import { addPrice, deletePrice } from "./actions";

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
