-- Таблица заметок мерчантов
create table if not exists public.merchant_notes (
  uid bigint primary key,
  user_name text,
  note text default '',
  tags text[] default '{}',
  contacts jsonb default '[]',
  blacklist boolean default false,
  updated_at timestamptz default now()
);

-- Если таблица уже создавалась раньше (без blacklist) — доуронить колонку:
-- alter table public.merchant_notes add column if not exists blacklist boolean default false;

-- RLS включён, но политики открыты для anon (any URL holder может читать/писать).
-- Пароль-гейт на сайте — только отсев случайных, НЕ защита данных.
-- Ужесточить при необходимости (секрет в заголовке / Supabase Auth).
alter table public.merchant_notes enable row level security;

create policy "anon read"  on public.merchant_notes for select using (true);
create policy "anon write" on public.merchant_notes for insert with check (true);
create policy "anon update" on public.merchant_notes for update using (true) with check (true);
create policy "anon delete" on public.merchant_notes for delete using (true);

-- Табличные привилегии для роли anon. БЕЗ этого RLS-политики не срабатывают —
-- PostgREST возвращает 401 "permission denied for table" (42501). Обязательно.
grant select, insert, update, delete on public.merchant_notes to anon;
