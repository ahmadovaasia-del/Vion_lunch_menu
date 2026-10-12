-- Система заказа офисных обедов: базовая схема.
-- Весь доступ к данным идёт с сервера Next.js (service role), поэтому RLS
-- включён на всех таблицах без политик: браузер напрямую ничего не читает.

create table departments (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table employees (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  email         text not null unique check (email = lower(email)),
  phone         text,
  department_id uuid references departments(id) on delete set null,
  role          text not null default 'employee' check (role in ('employee', 'admin')),
  is_active     boolean not null default true,
  locale        text not null default 'ru' check (locale in ('ru', 'ro')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Одна строка настроек (id всегда = 1).
create table settings (
  id             int primary key default 1 check (id = 1),
  send_mode      text not null default 'admin' check (send_mode in ('admin', 'supplier')),
  supplier_email text,
  admin_emails   text[] not null default '{}',
  cutoff_time    time not null default '09:15',
  send_time      time not null default '09:30',
  company_share  numeric(4, 3) not null default 0.5 check (company_share between 0 and 1),
  updated_at     timestamptz not null default now()
);
insert into settings (id) values (1);

-- История цен: действует запись с максимальной valid_from <= даты обеда.
create table prices (
  id         uuid primary key default gen_random_uuid(),
  full_price numeric(10, 2) not null check (full_price >= 0),
  half_price numeric(10, 2) not null check (half_price >= 0),
  valid_from date not null unique,
  created_at timestamptz not null default now()
);

-- Меню на день. День с меню = рабочий день, на который можно заказывать.
-- Название блюда обязательно хотя бы на одном языке.
create table menu_days (
  date       date primary key,
  soup_ru    text,
  soup_ro    text,
  main_a_ru  text,
  main_a_ro  text,
  main_b_ru  text,
  main_b_ro  text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (coalesce(soup_ru, soup_ro) is not null),
  check (coalesce(main_a_ru, main_a_ro) is not null),
  check (coalesce(main_b_ru, main_b_ro) is not null)
);

-- Заказ сотрудника на день. «Не заказываю» = строки нет.
-- price фиксирует цену в момент заказа, чтобы смена цен не меняла прошлое.
create table orders (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date        date not null references menu_days(date) on delete restrict,
  variant     text not null check (variant in ('A', 'B')),
  portion     text not null check (portion in ('full', 'half')),
  price       numeric(10, 2) not null check (price >= 0),
  updated_by  uuid references employees(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (employee_id, date)
);
create index orders_date_idx on orders (date);

-- Журнал ручных правок заказов администратором.
create table order_changes (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees(id) on delete cascade,
  date        date not null,
  old_value   text,  -- например 'A/full', null = не заказывал
  new_value   text,
  changed_by  uuid references employees(id) on delete set null,
  changed_at  timestamptz not null default now()
);

-- Отправленные ежедневные сводки: защита от повторной отправки + архив.
create table daily_dispatches (
  date       date primary key,
  sent_at    timestamptz not null default now(),
  recipients text[] not null,
  payload    jsonb not null
);

alter table departments      enable row level security;
alter table employees        enable row level security;
alter table settings         enable row level security;
alter table prices           enable row level security;
alter table menu_days        enable row level security;
alter table orders           enable row level security;
alter table order_changes    enable row level security;
alter table daily_dispatches enable row level security;
