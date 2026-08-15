-- Таблица заметок мерчантов
create table if not exists public.merchant_notes (
  uid bigint primary key,
  user_name text,
  note text default '',
  tags text[] default '{}',
  contacts jsonb default '[]',
  updated_at timestamptz default now()
);

-- RLS: включаем и разрешаем anon read/write (защита — пароль-гейт на сайте).
-- Если нужен более строгий доступ — заменить на политику с секретом/JWT.
alter table public.merchant_notes enable row level security;

create policy "anon read"  on public.merchant_notes for select using (true);
create policy "anon write" on public.merchant_notes for insert with check (true);
create policy "anon update" on public.merchant_notes for update using (true) with check (true);
create policy "anon delete" on public.merchant_notes for delete using (true);
