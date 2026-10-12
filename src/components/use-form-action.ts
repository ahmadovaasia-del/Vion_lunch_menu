"use client";

import { useActionState, useRef, useTransition, type FormEvent } from "react";

/**
 * Как useActionState, но без автоматического сброса формы React 19:
 * при ошибке валидации введённые значения остаются в полях.
 * resetWhen(result) — очистить форму после такого результата (например, после добавления).
 */
export function useFormAction<S>(
  action: (prev: S | null, form: FormData) => Promise<S>,
  resetWhen?: (result: S) => boolean,
) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const [state, dispatch, pending] = useActionState(async (prev: S | null, form: FormData) => {
    const result = await action(prev, form);
    if (resetWhen?.(result)) formRef.current?.reset();
    return result;
  }, null);
  const [, startTransition] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    formRef.current = e.currentTarget;
    const form = new FormData(e.currentTarget);
    startTransition(() => dispatch(form));
  };
  return [state, onSubmit, pending] as const;
}
