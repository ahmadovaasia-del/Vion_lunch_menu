import { getDict } from "@/i18n/server";
import { confirmLink } from "./actions";

// Ссылка из письма ведёт сюда. Вход происходит только по нажатию кнопки:
// почтовые сканеры (Outlook Safe Links) открывают ссылку, но кнопку не нажимают,
// поэтому одноразовая ссылка не «сгорает» до клика сотрудника.
export default async function ConfirmPage({ searchParams }: PageProps<"/auth/confirm">) {
  const { t } = await getDict();
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";
  const code = typeof params.code === "string" ? params.code : "";
  const type = typeof params.type === "string" ? params.type : "email";

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <h1 className="text-2xl font-semibold">{t.appName}</h1>
      {tokenHash || code ? (
        <form action={confirmLink} className="flex flex-col gap-3">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="type" value={type} />
          <button className="btn-primary py-3 text-lg">{t.login.confirmButton}</button>
        </form>
      ) : (
        <p className="alert-error">{t.login.linkFailed}</p>
      )}
    </main>
  );
}
