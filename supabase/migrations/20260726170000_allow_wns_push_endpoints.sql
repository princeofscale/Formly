-- Accepts Windows Push Notification Services endpoints.
--
-- 20260726152000 narrowed stored endpoints to Google, Mozilla and Apple hosts,
-- which closed off arbitrary outbound targets but also excluded Edge on
-- Windows: it subscribes through per-region WNS hosts such as
-- wns2-bl2p.notify.windows.com. Every Edge registration was therefore rejected
-- at the database.
--
-- No cleanup delete accompanies this: the new pattern is a superset of the old
-- one, so every row that satisfied the previous constraint satisfies this one.
-- VALIDATE is left to fail the transaction if that assumption is ever wrong.

begin;

alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_endpoint_check;

alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_check
  check (
    endpoint ~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|web\.push\.apple\.com|([a-z0-9-]+\.)?notify\.windows\.com)/'
  ) not valid;

alter table public.push_subscriptions validate constraint push_subscriptions_endpoint_check;

commit;
