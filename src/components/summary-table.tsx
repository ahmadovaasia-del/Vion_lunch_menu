import type { Dictionary } from "@/i18n/dictionaries";
import type { DaySummary } from "@/lib/orders";

export function SummaryTable({ t, s }: { t: Dictionary["day"]; s: DaySummary }) {
  const cell = "px-3 py-2 text-right tabular-nums";
  return (
    <table className="w-full text-sm">
      <thead className="text-muted">
        <tr>
          <th className="px-3 py-2 text-left font-normal">{t.variant}</th>
          <th className={`${cell} font-normal`}>{t.fullLunches}</th>
          <th className={`${cell} font-normal`}>{t.halfLunches}</th>
          <th className={`${cell} font-normal`}>{t.total}</th>
        </tr>
      </thead>
      <tbody>
        {(["A", "B"] as const).map((v) => (
          <tr key={v} className="border-t border-border">
            <td className="px-3 py-2 font-semibold">{v}</td>
            <td className={cell}>{s[v].full}</td>
            <td className={cell}>{s[v].half}</td>
            <td className={cell}>{s[v].full + s[v].half}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-border font-semibold">
          <td className="px-3 py-2">{t.total}</td>
          <td className={cell}>{s.full}</td>
          <td className={cell}>{s.half}</td>
          <td className={cell}>{s.total}</td>
        </tr>
      </tbody>
    </table>
  );
}
