begin;

update public.workout_templates wt
set exercises = (
  select jsonb_agg(
    case
      when item ->> 'exercise_id' = '0d3d288e-be88-46e9-a124-15844d4aa632'
        then jsonb_set(
          item,
          '{exercise_id}',
          to_jsonb('d283164a-28a7-4378-9a95-c8de501a4b8f'::text)
        )
      else item
    end
    order by ordinality
  )
  from jsonb_array_elements(wt.exercises) with ordinality items(item, ordinality)
)
where exists (
  select 1
  from jsonb_array_elements(wt.exercises) item
  where item ->> 'exercise_id' = '0d3d288e-be88-46e9-a124-15844d4aa632'
);

do $$
begin
  if exists (
    select 1
    from public.workout_templates wt
    cross join lateral jsonb_array_elements(wt.exercises) item
    left join public.exercises e on e.id = (item ->> 'exercise_id')::uuid
    where item ? 'exercise_id' and e.id is null
  ) then
    raise exception 'workout templates still reference removed exercises';
  end if;
end;
$$;

commit;
