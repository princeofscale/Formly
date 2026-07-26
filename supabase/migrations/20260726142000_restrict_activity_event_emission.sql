begin;

revoke all on function public.emit_activity_event(text, uuid, jsonb)
from public, anon, authenticated;

commit;
