-- An exercise note used to be one row per athlete per exercise, so a remark
-- meant for one day — "seat at 4", "left shoulder complained on the third set" —
-- came back attached to the same machine weeks later, long after it stopped
-- being true. A note now belongs to the workout it was written in.
--
-- Existing notes are kept: each is handed to the most recent session in which
-- the athlete actually did that exercise, which is the workout it was almost
-- certainly written during. A note on an exercise with no logged set anywhere
-- has no workout to belong to and is dropped.

alter table exercise_notes
  add column session_id uuid references workout_sessions(id) on delete cascade;

update exercise_notes en
set session_id = (
  select se.session_id
  from set_entries se
  where se.user_id = en.user_id
    and se.exercise_id = en.exercise_id
  order by se.created_at desc
  limit 1
);

delete from exercise_notes where session_id is null;

alter table exercise_notes
  alter column session_id set not null,
  drop constraint exercise_notes_pkey,
  add primary key (user_id, session_id, exercise_id);

-- The client now supplies a session id along with the note. `using` alone kept
-- an athlete out of other people's notes but said nothing about which session a
-- note may be filed under, so the write side is stated explicitly.
drop policy if exists "users manage own exercise notes" on exercise_notes;

create policy "users manage own exercise notes"
  on exercise_notes
  for all
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from workout_sessions ws
      where ws.id = session_id and ws.user_id = auth.uid()
    )
  );
