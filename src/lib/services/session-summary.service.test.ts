import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getSessionSummary } from './session-summary.service'

/**
 * The service runs up to four queries: the session, its sets, the history for a
 * PR check, and the previous session. Answers are queued per table in the order
 * it asks for them, which survives the two queries it skips — history when the
 * session logged nothing, and the comparison on a cardio day.
 */
function fakeSupabase(queues: Record<string, unknown[]>, filters: string[] = []): SupabaseClient {
  const chain = (table: string, data: unknown) => {
    const self: Record<string, unknown> = {}
    for (const method of ['select', 'in', 'gt', 'neq', 'not', 'lt', 'order', 'limit']) {
      self[method] = () => self
    }
    // `eq` is recorded rather than ignored: the fake answers whatever it is
    // asked, so a null result proves nothing on its own about who asked.
    self.eq = (column: string, value: unknown) => {
      filters.push(`${table}.${column}=${String(value)}`)
      return self
    }
    self.single = async () => ({ data })
    // Every other query is awaited on the builder itself, so it has to be thenable.
    self.then = (onFulfilled: (v: { data: unknown }) => unknown) =>
      Promise.resolve({ data }).then(onFulfilled)
    return self
  }

  return {
    from: (table: string) => chain(table, queues[table]?.shift() ?? null),
  } as unknown as SupabaseClient
}

const SESSION = {
  id: 'S1',
  started_at: '2026-07-29T10:00:00.000Z',
  finished_at: '2026-07-29T11:00:00.000Z',
  total_volume_kg: 1900,
  session_type: 'strength',
}

function loggedSet(over: Record<string, unknown> = {}) {
  return {
    exercise_id: 'bench',
    session_id: 'S1',
    weight_kg: 100,
    reps: 5,
    is_warmup: false,
    created_at: '2026-07-29T10:10:00.000Z',
    exercises: { name: 'Bench Press', name_ru: 'Жим лёжа' },
    ...over,
  }
}

/** Queues a whole run, so a test only states the rows it cares about. */
function run(
  over: {
    session?: unknown
    sets?: unknown[]
    history?: unknown[]
    previous?: unknown[]
  },
  filters?: string[],
) {
  return getSessionSummary(
    fakeSupabase(
      {
        workout_sessions: ['session' in over ? over.session : SESSION, over.previous ?? []],
        set_entries: [over.sets ?? [], over.history ?? []],
      },
      filters,
    ),
    'U1',
    'S1',
  )
}

describe('getSessionSummary', () => {
  it('reports nothing for a session that is not the athlete’s', async () => {
    // Both id and user_id are filtered in the query, so a miss means either a
    // bad id or someone else's session. Neither may return numbers.
    const filters: string[] = []
    await expect(run({ session: null }, filters)).resolves.toBeNull()

    // The scoping is the assertion. RLS is the real gate, but this query is the
    // one that decides whether the rest of the summary runs at all.
    expect(filters).toContain('workout_sessions.id=S1')
    expect(filters).toContain('workout_sessions.user_id=U1')
  })

  it('scopes the sets it adds up to the athlete and the session', async () => {
    const filters: string[] = []
    await run({ sets: [loggedSet()] }, filters)

    expect(filters).toContain('set_entries.user_id=U1')
    expect(filters).toContain('set_entries.session_id=S1')
  })

  it('counts every set logged but only working sets for the coach', async () => {
    const summary = await run({
      sets: [
        loggedSet({
          weight_kg: 50,
          reps: 8,
          is_warmup: true,
          created_at: '2026-07-29T10:05:00.000Z',
        }),
        loggedSet(),
        loggedSet({ created_at: '2026-07-29T10:20:00.000Z' }),
        loggedSet({ created_at: '2026-07-29T10:30:00.000Z' }),
      ],
    })

    expect(summary?.totalSets).toBe(4)
    // The ramp is in the tonnage the athlete sees but out of the set count the
    // coach judges, which is what stops 3 working sets reading as 4.
    expect(summary?.workingSets).toBe(3)
    expect(summary?.totalReps).toBe(23)
    expect(summary?.totalVolumeKg).toBe(1900)
    expect(summary?.durationMinutes).toBe(60)
  })

  it('ranks exercises by volume and keeps the top three', async () => {
    const summary = await run({
      sets: [
        loggedSet({
          exercise_id: 'a',
          weight_kg: 10,
          reps: 1,
          exercises: { name: 'A', name_ru: null },
        }),
        loggedSet({
          exercise_id: 'b',
          weight_kg: 40,
          reps: 1,
          exercises: { name: 'B', name_ru: null },
        }),
        // Supabase returns an embedded row as an object or a single-element
        // array depending on the join, and both have to name the exercise.
        loggedSet({
          exercise_id: 'c',
          weight_kg: 30,
          reps: 1,
          exercises: [{ name: 'C', name_ru: null }],
        }),
        loggedSet({
          exercise_id: 'd',
          weight_kg: 20,
          reps: 1,
          exercises: { name: 'D', name_ru: null },
        }),
      ],
    })

    expect(summary?.topExercises.map((e) => e.name)).toEqual(['B', 'C', 'D'])
    expect(summary?.topExercises[0]).toMatchObject({ volume: 40, sets: 1 })
  })

  it('calls a lift heavier than the all-time best a PR', async () => {
    const summary = await run({
      sets: [loggedSet({ weight_kg: 102.5 })],
      history: [
        { exercise_id: 'bench', weight_kg: 100 },
        { exercise_id: 'bench', weight_kg: 95 },
      ],
    })

    expect(summary?.prs).toEqual([
      {
        exerciseId: 'bench',
        exerciseName: 'Bench Press',
        exerciseNameRu: 'Жим лёжа',
        newBest: 102.5,
        previousBest: 100,
        improvementPct: 2.5,
      },
    ])
  })

  it('treats a first-ever result as a baseline, not a record', async () => {
    const summary = await run({ sets: [loggedSet({ weight_kg: 102.5 })], history: [] })

    expect(summary?.prs).toEqual([])
  })

  it('does not let a warm-up stand in as the session best', async () => {
    // A ramp set can be logged at any weight, including a mistyped one. If it
    // counted towards the best lift, the athlete would be told they set a
    // record they never worked for.
    const summary = await run({
      sets: [
        loggedSet({ weight_kg: 120, is_warmup: true }),
        loggedSet({ weight_kg: 100, created_at: '2026-07-29T10:20:00.000Z' }),
      ],
      history: [{ exercise_id: 'bench', weight_kg: 110 }],
    })

    expect(summary?.prs).toEqual([])
  })

  it('measures tonnage against the previous strength session', async () => {
    const summary = await run({
      sets: [loggedSet()],
      previous: [
        {
          started_at: '2026-07-27T10:00:00.000Z',
          finished_at: '2026-07-27T10:45:00.000Z',
          total_volume_kg: 1000,
        },
      ],
    })

    // 500 kg logged against 1000 kg last time.
    expect(summary?.comparison).toEqual({
      prevTonnage: 1000,
      deltaTonnagePct: -50,
      prevDurationMinutes: 45,
    })
  })

  it('leaves the comparison empty when there is nothing to compare with', async () => {
    const summary = await run({ sets: [loggedSet()], previous: [] })

    expect(summary?.comparison).toBeNull()
  })

  it('does not compare tonnage on a cardio day', async () => {
    // Cardio logs no weight, so a comparison would read as a total collapse.
    const summary = await run({
      session: { ...SESSION, session_type: 'cardio' },
      sets: [loggedSet()],
      previous: [
        {
          started_at: '2026-07-27T10:00:00.000Z',
          finished_at: '2026-07-27T10:45:00.000Z',
          total_volume_kg: 1000,
        },
      ],
    })

    expect(summary?.comparison).toBeNull()
  })
})
