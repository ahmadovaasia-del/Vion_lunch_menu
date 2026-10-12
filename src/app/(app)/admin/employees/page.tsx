import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { getDict } from "@/i18n/server";
import { fmt } from "@/i18n/dictionaries";
import type { Department, Employee } from "@/lib/types";
import { DepartmentForm, EmployeeForm, ImportForm } from "./forms";

export default async function EmployeesPage() {
  const me = await requireAdmin();
  const { t } = await getDict();
  const db = createAdminClient();
  const [{ data: employees }, { data: departments }] = await Promise.all([
    db.from("employees").select("*").order("is_active", { ascending: false }).order("full_name").returns<Employee[]>(),
    db.from("departments").select("id, name").order("name").returns<Department[]>(),
  ]);
  const emps = employees ?? [];
  const depts = departments ?? [];
  const deptName = new Map(depts.map((d) => [d.id, d.name]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-xl font-semibold">{t.employees.title}</h1>
        <span className="text-sm text-muted">
          {fmt(t.employees.count, { total: emps.length, active: emps.filter((e) => e.is_active).length })}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <details className="card">
          <summary className="cursor-pointer font-medium">+ {t.employees.add}</summary>
          <div className="mt-3">
            <EmployeeForm t={t} departments={depts} />
          </div>
        </details>
        <details className="card">
          <summary className="cursor-pointer font-medium">{t.employees.importTitle}</summary>
          <div className="mt-3">
            <ImportForm t={t} />
          </div>
        </details>
      </div>

      <details className="card">
        <summary className="cursor-pointer font-medium">
          {t.employees.department}: {depts.map((d) => d.name).join(", ") || "—"}
        </summary>
        <div className="mt-3">
          <DepartmentForm t={t} />
        </div>
      </details>

      <ul className="flex flex-col gap-2">
        {emps.map((e) => (
          <li key={e.id}>
            <details className={`card ${e.is_active ? "" : "opacity-60"}`}>
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{e.full_name}</span>
                {e.role === "admin" && (
                  <span className="rounded bg-accent/15 px-1.5 text-xs text-accent">{t.employees.roleAdmin}</span>
                )}
                {!e.is_active && <span className="text-xs text-danger">{t.employees.inactive}</span>}
                <span className="w-full text-sm text-muted sm:ml-auto sm:w-auto">
                  {e.email}
                  {e.department_id && ` · ${deptName.get(e.department_id)}`}
                </span>
              </summary>
              <div className="mt-3 border-t border-border pt-3">
                <EmployeeForm t={t} departments={depts} employee={e} isSelf={e.id === me.id} />
              </div>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
}
