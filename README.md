# Vion Lunch Menu

Система заказа офисных обедов: сотрудники выбирают обеды на неделю вперёд,
админ получает ежедневную сводку в 9:30 (Кишинёв) и выгружает месячный
отчёт для бухгалтерии. Интерфейс на русском и румынском.

Next.js 16 · Supabase (Postgres + вход по коду из письма) · Vercel · Resend.

## Настройка

### 1. Supabase

1. Создайте проект на <https://supabase.com> (регион — Frankfurt).
2. **SQL Editor** → выполните по очереди файлы из `supabase/migrations/`.
3. **Authentication → Sign In / Providers → Email**: включён; *Confirm email* — можно оставить.
4. **Authentication → Emails → Templates → Magic Link** — замените текст письма,
   чтобы в нём были и код, и ссылка:

   ```html
   <h2>Вход в «Обеды» / Prânzuri</h2>
   <p>Код / Codul: <b style="font-size:24px">{{ .Token }}</b></p>
   <p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Войти / Intră</a></p>
   ```

5. **Authentication → URL Configuration → Site URL** — адрес сайта на Vercel.
6. Встроенная почта Supabase отправляет лишь несколько писем в час. Для работы
   подключите SMTP: **Authentication → Emails → SMTP Settings** (например, SMTP Resend:
   host `smtp.resend.com`, port `465`, user `resend`, password — API-ключ Resend).

### 2. Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните. На Vercel — те же
переменные в **Project → Settings → Environment Variables**.

`BOOTSTRAP_ADMIN_EMAIL` — e-mail первого администратора: при первом входе
он создаётся автоматически. Остальных сотрудников добавляет администратор.

### 3. Запуск

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # тесты (логика + миграции на встроенном Postgres)
```

## Структура

- `supabase/migrations/` — схема базы
- `src/lib/` — доступ к данным, авторизация, бизнес-логика
- `src/app/(app)/` — страницы для вошедших пользователей, `admin/` — админка
- `src/i18n/` — переводы ru/ro
