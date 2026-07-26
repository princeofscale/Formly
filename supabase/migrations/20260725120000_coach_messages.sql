-- Тред с AI-коучем. Таблица принадлежит одному человеку целиком, поэтому
-- здесь обычные политики RLS, а не SECURITY DEFINER-функции: тот приём был
-- нужен в activity_social_layer и direct_messages для чтения чужих данных
-- через предикат are_connected, и здесь он был бы лишним усложнением.

create table if not exists coach_messages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  role       text not null check (role in ('user', 'assistant')),
  body       text not null check (length(body) between 1 and 4000),
  evidence   text,
  created_at timestamptz not null default now()
);

-- Хвост треда читается по этому индексу: order by created_at desc + limit.
create index if not exists coach_messages_thread_idx
  on coach_messages (user_id, created_at desc);

alter table coach_messages enable row level security;

drop policy if exists coach_messages_select_own on coach_messages;
create policy coach_messages_select_own on coach_messages
  for select using (auth.uid() = user_id);

drop policy if exists coach_messages_insert_own on coach_messages;
create policy coach_messages_insert_own on coach_messages
  for insert with check (auth.uid() = user_id);

-- Политик update и delete нет намеренно: редактирование и удаление сообщений
-- в объём не входят, а отсутствие политики надёжнее любой проверки в коде.

comment on column coach_messages.evidence is
  'Цифра из данных человека, на которой стоит ответ. Заполняется только для role = assistant.';
