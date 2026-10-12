import { getDict } from "@/i18n/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { locale, t } = await getDict();
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t.appName}</h1>
        <LanguageSwitcher locale={locale} />
      </div>
      {error === "link" && <p className="alert-error">{t.login.linkFailed}</p>}
      <LoginForm t={t.login} />
    </main>
  );
}
