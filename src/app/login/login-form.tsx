"use client";

import { useActionState, useState } from "react";
import type { Dictionary } from "@/i18n/dictionaries";
import { requestCode, verifyCode, type LoginState } from "./actions";

export function LoginForm({ t }: { t: Dictionary["login"] }) {
  const [emailState, sendAction, sending] = useActionState<LoginState, FormData>(requestCode, {
    step: "email",
  });
  const [codeState, verifyAction, verifying] = useActionState<LoginState, FormData>(verifyCode, {
    step: "code",
    email: "",
  });
  const [editingEmail, setEditingEmail] = useState(false);

  const email = emailState.step === "code" && !editingEmail ? emailState.email : null;

  if (!email) {
    return (
      <form
        action={(fd) => {
          setEditingEmail(false);
          sendAction(fd);
        }}
        className="flex flex-col gap-3"
      >
        <label className="label" htmlFor="email">{t.emailLabel}</label>
        <input id="email" name="email" type="email" required autoComplete="email" inputMode="email" className="input" />
        {emailState.error && <p className="alert-error">{t[emailState.error]}</p>}
        <button className="btn-primary" disabled={sending}>{t.sendCode}</button>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="flex flex-col gap-3">
      <p className="text-sm text-muted">
        {t.codeSent} <b>{email}</b>
      </p>
      <input type="hidden" name="email" value={email} />
      <label className="label" htmlFor="code">{t.codeLabel}</label>
      <input
        id="code"
        name="code"
        required
        autoComplete="one-time-code"
        inputMode="numeric"
        pattern="[0-9 ]{6,10}"
        className="input text-center text-2xl tracking-[0.4em]"
      />
      {codeState.error && <p className="alert-error">{t.invalidCode}</p>}
      <button className="btn-primary" disabled={verifying}>{t.verify}</button>
      <button type="button" className="btn-link" onClick={() => setEditingEmail(true)}>
        {t.otherEmail}
      </button>
    </form>
  );
}
