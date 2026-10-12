"use client";

import { useActionState } from "react";
import { useFormAction } from "@/components/use-form-action";
import { fmt, type Dictionary } from "@/i18n/dictionaries";
import type { Department, Employee } from "@/lib/types";
import { addDepartment, importEmployees, saveEmployee } from "./actions";

function errorText(t: Dictionary, error: string) {
  const known = t.employees as Record<string, string>;
  return known[error] ?? error;
}

export function EmployeeForm({
  t,
  departments,
  employee,
  isSelf = false,
}: {
  t: Dictionary;
  departments: Department[];
  employee?: Employee;
  isSelf?: boolean;
}) {
  const [state, onSubmit, pending] = useFormAction(saveEmployee, (r) => r.ok && !employee);
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
      {employee && <input type="hidden" name="id" value={employee.id} />}
      <label className="flex flex-col gap-1">
        <span className="label">{t.employees.fullName}</span>
        <input name="full_name" required defaultValue={employee?.full_name} className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.employees.email}</span>
        <input name="email" type="email" required defaultValue={employee?.email} className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.employees.phone}</span>
        <input name="phone" type="tel" defaultValue={employee?.phone ?? ""} className="input" />
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.employees.department}</span>
        <select name="department_id" defaultValue={employee?.department_id ?? ""} className="input">
          <option value="">{t.employees.noDepartment}</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.employees.role}</span>
        <select name="role" defaultValue={employee?.role ?? "employee"} className="input" disabled={isSelf}>
          <option value="employee">{t.employees.roleEmployee}</option>
          <option value="admin">{t.employees.roleAdmin}</option>
        </select>
        {isSelf && <input type="hidden" name="role" value="admin" />}
      </label>
      <label className="flex flex-col gap-1">
        <span className="label">{t.employees.language}</span>
        <select name="locale" defaultValue={employee?.locale ?? "ru"} className="input">
          <option value="ru">Русский</option>
          <option value="ro">Română</option>
        </select>
      </label>
      <label className="flex items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          name="is_active"
          defaultChecked={employee?.is_active ?? true}
          disabled={isSelf}
          className="size-5 accent-[var(--accent)]"
        />
        {isSelf && <input type="hidden" name="is_active" value="on" />}
        <span>{t.employees.active}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{employee ? t.common.save : t.common.add}</button>
        {state?.ok === true && <span className="alert-ok">{t.common.saved}</span>}
        {state?.ok === false && <span className="alert-error">{errorText(t, state.error)}</span>}
      </div>
    </form>
  );
}

export function DepartmentForm({ t }: { t: Dictionary }) {
  const [state, action, pending] = useActionState(addDepartment, null);
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input name="name" required placeholder={t.employees.newDepartment} className="input max-w-xs" />
      <button className="btn-secondary" disabled={pending}>{t.employees.addDepartment}</button>
      {state?.ok === false && <span className="alert-error">{errorText(t, state.error)}</span>}
    </form>
  );
}

export function ImportForm({ t }: { t: Dictionary }) {
  const [state, action, pending] = useActionState(importEmployees, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <p className="text-sm text-muted">{t.employees.importHint}</p>
      <input
        name="file"
        type="file"
        required
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="text-sm"
      />
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" disabled={pending}>{t.employees.importButton}</button>
        {state?.ok === true && <span className="alert-ok">{fmt(t.employees.importResult, { created: state.created, updated: state.updated, skipped: state.skipped })}</span>}
        {state?.ok === false && <span className="alert-error">{errorText(t, state.error)}</span>}
      </div>
    </form>
  );
}
