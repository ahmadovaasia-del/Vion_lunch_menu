import { createAdminClient } from "@/lib/supabase/server";
import { getDict } from "@/i18n/server";
import { chisinauNow, formatDay } from "@/lib/dates";
import { priceOn, type Price } from "@/lib/menu";
import { getSettings } from "@/lib/settings";
import { DeletePriceButton, DispatchSettingsForm, PriceForm } from "./forms";

export default async function SettingsPage() {
  const { locale, t } = await getDict();
  const db = createAdminClient();
  const [{ data }, settings] = await Promise.all([
    db.from("prices").select("*").order("valid_from", { ascending: false }).returns<Price[]>(),
    getSettings(),
  ]);
  const prices = data ?? [];
  const today = chisinauNow().date;
  const current = priceOn(prices, today);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">{t.settings.title}</h1>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">{t.settings.prices}</h2>
        <p className="text-sm text-muted">{t.settings.pricesHint}</p>
        {prices.length > 0 && (
          <table className="w-full text-sm">
            <thead className="text-left text-muted">
              <tr>
                <th className="py-1 font-normal">{t.settings.validFrom}</th>
                <th className="py-1 text-right font-normal">{t.settings.fullPrice}</th>
                <th className="py-1 text-right font-normal">{t.settings.halfPrice}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {prices.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="py-2">
                    {formatDay(p.valid_from, locale, { day: "numeric", month: "short", year: "numeric" })}
                    {p.id === current?.id && <span className="ml-2 text-xs text-accent">{t.settings.current}</span>}
                    {p.valid_from > today && <span className="ml-2 text-xs text-muted">{t.settings.future}</span>}
                  </td>
                  <td className="py-2 text-right tabular-nums">{Number(p.full_price).toFixed(2)}</td>
                  <td className="py-2 text-right tabular-nums">{Number(p.half_price).toFixed(2)}</td>
                  <td className="py-2 text-right">
                    <DeletePriceButton id={p.id} label={t.settings.delete} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <PriceForm t={t} today={today} />
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-semibold">{t.settings.dispatch}</h2>
        <DispatchSettingsForm t={t} settings={settings} />
      </section>
    </div>
  );
}
