-- Mark warm-up sets so analytics (volume, PRs, muscle heatmap, weak-points)
-- can exclude them. A 50%×8 + 70%×5 + 85%×3 ramp before a working set
-- triples your "session volume" if treated equally; warm-ups are real
-- work but don't belong in progression metrics.

alter table set_entries
  add column if not exists is_warmup boolean not null default false;

-- Index helps the common analytic query: "sum volume for user X over period,
-- excluding warm-ups". Without it we'd scan the user's full history.
create index if not exists set_entries_user_warmup_started
  on set_entries(user_id, is_warmup)
  where is_warmup = false;
