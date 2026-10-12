import { requireEmployee } from "@/lib/auth";
import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/dictionaries";

export default async function HomePage() {
  const me = await requireEmployee();
  const { t } = await getDict();
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-semibold">{fmt(t.home.hello, { name: me.full_name })}</h1>
      <p className="text-muted">{t.home.comingSoon}</p>
    </div>
  );
}
