-- Web Push subscriptions per user. One user may have multiple endpoints (mobile + desktop).
create table push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique(user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "users manage own subscriptions"
  on push_subscriptions
  for all
  using (auth.uid() = user_id);

create index push_subscriptions_user_id on push_subscriptions(user_id);
