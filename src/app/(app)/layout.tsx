import Link from "next/link";
import { requireEmployee } from "@/lib/auth";
import { getDict } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { logout } from "@/app/login/actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const me = await requireEmployee();
  const { locale, t } = await getDict();

  const links = [
    { href: "/", label: t.nav.myLunches },
    ...(me.role === "admin"
      ? [{ href: "/admin/employees", label: t.nav.employees }]
      : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-2">
          <Link href="/" className="font-semibold">{t.appName}</Link>
          <nav className="flex flex-1 gap-1 overflow-x-auto text-sm">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="whitespace-nowrap rounded-md px-2 py-1 hover:bg-background">
                {l.label}
              </Link>
            ))}
          </nav>
          <LanguageSwitcher locale={locale} />
          <form action={logout}>
            <button className="btn-link" title={me.email}>{t.nav.logout}</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-6">{children}</main>
    </>
  );
}
