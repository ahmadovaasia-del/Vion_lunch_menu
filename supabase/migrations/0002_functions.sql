-- Цена обеда на дату: действует запись с максимальной valid_from <= даты.
create or replace function price_for(p_date date, p_portion text)
returns numeric
language sql stable
as $$
  select case when p_portion = 'full' then full_price else half_price end
  from prices
  where valid_from <= p_date
  order by valid_from desc
  limit 1
$$;

-- Пересчитать цены заказов начиная с даты (после добавления/удаления цены).
create or replace function reprice_orders(p_from date)
returns integer
language sql
as $$
  with changed as (
    update orders
    set price = price_for(date, portion), updated_at = now()
    where date >= p_from
      and price_for(date, portion) is not null
      and price is distinct from price_for(date, portion)
    returning 1
  )
  select count(*)::int from changed
$$;

-- Поставить/изменить/снять заказ. p_variant = null → «не заказываю».
-- Если меняет не сам сотрудник (админ), пишем в журнал order_changes.
-- Проверка времени блокировки — на стороне приложения (админ может менять всегда).
create or replace function set_order(
  p_employee uuid,
  p_date     date,
  p_variant  text,
  p_portion  text,
  p_actor    uuid
) returns void
language plpgsql
as $$
declare
  v_old   text;
  v_new   text;
  v_price numeric;
begin
  select variant || '/' || portion into v_old
  from orders where employee_id = p_employee and date = p_date
  for update;

  if p_variant is null then
    delete from orders where employee_id = p_employee and date = p_date;
    v_new := null;
  else
    v_price := price_for(p_date, p_portion);
    if v_price is null then
      raise exception 'no_price' using errcode = 'P0001';
    end if;
    insert into orders (employee_id, date, variant, portion, price, updated_by)
    values (p_employee, p_date, p_variant, p_portion, v_price, p_actor)
    on conflict (employee_id, date) do update
      set variant = excluded.variant,
          portion = excluded.portion,
          price = excluded.price,
          updated_by = excluded.updated_by,
          updated_at = now();
    v_new := p_variant || '/' || p_portion;
  end if;

  if p_actor is distinct from p_employee and v_old is distinct from v_new then
    insert into order_changes (employee_id, date, old_value, new_value, changed_by)
    values (p_employee, p_date, v_old, v_new, p_actor);
  end if;
end
$$;

-- Функции вызываются только сервером (service role), не из браузера.
revoke execute on function price_for(date, text), reprice_orders(date), set_order(uuid, date, text, text, uuid) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function price_for(date, text), reprice_orders(date), set_order(uuid, date, text, text, uuid)
      from anon, authenticated;
  end if;
end
$$;
