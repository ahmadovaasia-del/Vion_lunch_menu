-- Автоматическая отправка ежедневной сводки (тариф Vercel Hobby не даёт точного cron).
-- Выполнить ОДИН раз в Supabase → SQL Editor, подставив адрес сайта и CRON_SECRET.
-- Нужны расширения pg_cron и pg_net: Database → Extensions → включить оба.
--
-- Задание дёргает приложение каждые 15 минут с 06:00 до 10:45 UTC по будням
-- (это 9:00–13:45 по Кишинёву летом и 8:00–12:45 зимой). Приложение само проверяет,
-- наступило ли время отправки (по умолчанию 9:30 по Кишинёву), есть ли меню
-- на сегодня и не отправлялась ли уже сводка, поэтому письмо уходит ровно один раз.

select cron.schedule(
  'daily-lunch-summary',
  '*/15 6-10 * * 1-5',
  $$
  select net.http_post(
    url     := 'https://ВАШ-САЙТ.vercel.app/api/cron/daily-summary',
    headers := jsonb_build_object('Authorization', 'Bearer ВАШ_CRON_SECRET'),
    body    := '{}'::jsonb
  );
  $$
);

-- Проверить задания:      select * from cron.job;
-- История запусков:       select * from cron.job_run_details order by start_time desc limit 20;
-- Ответы приложения:      select * from net._http_response order by created desc limit 20;
-- Удалить задание:        select cron.unschedule('daily-lunch-summary');
