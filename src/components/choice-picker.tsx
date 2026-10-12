"use client";

import { useState, useTransition } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Choice, Portion, Variant } from "@/lib/orders";
import { setOrder } from "@/app/(app)/order-actions";

type Props = {
  t: Dictionary["order"];
  date: string;
  initial: Choice | null;
  locked: boolean;
  prices: { full: number; half: number } | null;
  employeeId?: string; // задано — правка админом
  compact?: boolean;
};

export function ChoicePicker({ t, date, initial, locked, prices, employeeId, compact = false }: Props) {
  const [choice, setChoice] = useState<Choice | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = (next: Choice | null) => {
    const prev = choice;
    setChoice(next);
    setError(null);
    startTransition(async () => {
      const result = await setOrder(date, next, employeeId);
      if (!result.ok) {
        setChoice(prev);
        setError(t[result.error]);
      }
    });
  };

  const pickVariant = (variant: Variant | null) =>
    save(variant ? { variant, portion: choice?.portion ?? "full" } : null);
  const pickPortion = (portion: Portion) => choice && save({ ...choice, portion });

  const seg = (active: boolean) =>
    `flex-1 px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-accent text-accent-fg" : "bg-surface hover:bg-background"
    } disabled:cursor-not-allowed`;
  const disabled = locked || pending;

  return (
    <div className={`flex flex-col gap-2 ${pending ? "opacity-70" : ""}`}>
      <div className="flex overflow-hidden rounded-lg border border-border">
        <button type="button" disabled={disabled} className={seg(choice?.variant === "A")} onClick={() => pickVariant("A")}>
          {t.variantA}
        </button>
        <button type="button" disabled={disabled} className={`${seg(choice?.variant === "B")} border-l border-border`} onClick={() => pickVariant("B")}>
          {t.variantB}
        </button>
        <button type="button" disabled={disabled} className={`${seg(choice === null)} border-l border-border ${compact ? "" : "flex-[2]"}`} onClick={() => pickVariant(null)}>
          {compact ? "—" : t.none}
        </button>
      </div>
      {choice && (
        <div className="flex overflow-hidden rounded-lg border border-border">
          <button type="button" disabled={disabled} className={seg(choice.portion === "full")} onClick={() => pickPortion("full")}>
            {t.withSoup}
            {prices && !compact && <span className="ml-1 font-normal opacity-80">· {prices.full} {t.lei}</span>}
          </button>
          <button type="button" disabled={disabled} className={`${seg(choice.portion === "half")} border-l border-border`} onClick={() => pickPortion("half")}>
            {t.withoutSoup}
            {prices && !compact && <span className="ml-1 font-normal opacity-80">· {prices.half} {t.lei}</span>}
          </button>
        </div>
      )}
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}
