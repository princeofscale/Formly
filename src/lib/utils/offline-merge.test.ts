import { describe, it, expect } from 'vitest'
import { mergeQueuedSets } from './offline-merge'
import { hasQueuedFinish, type QueuedFinishRecord, type QueuedSetRecord } from './offline-queue'
import type { Exercise, ExerciseWithSets, SetEntry } from '@/lib/types/models'

const SESSION = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const EX_BENCH = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const EX_SQUAT = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

function makeExercise(id: string, sets: SetEntry[] = []): ExerciseWithSets {
  return {
    id,
    name: 'Bench Press',
    name_ru: 'Жим лёжа',
    sets,
  } as unknown as ExerciseWithSets
}

function makeServerSet(exerciseId: string, setNumber: number): SetEntry {
  return {
    id: `srv_${exerciseId}_${setNumber}`,
    session_id: SESSION,
    user_id: 'u1',
    exercise_id: exerciseId,
    set_number: setNumber,
    weight_kg: 100,
    reps: 5,
    rpe: null,
    calculated_1rm: 116.7,
    rest_seconds: null,
    created_at: '2026-07-19T10:00:00.000Z',
  } as SetEntry
}

function makeQueued(
  id: string,
  sessionId: string,
  exerciseId: string,
  setNumber: number,
  weightKg = 100,
): QueuedSetRecord {
  return {
    id,
    queuedAt: 1789000000000,
    payload: { sessionId, exerciseId, setNumber, weightKg, reps: 5 },
  }
}

describe('mergeQueuedSets', () => {
  it('возвращает исходный массив без изменений при пустой очереди', () => {
    const exercises = [makeExercise(EX_BENCH)]
    expect(mergeQueuedSets(exercises, [], [], SESSION)).toBe(exercises)
  })

  it('подмешивает сет в существующее упражнение как offline_<id>', () => {
    const exercises = [makeExercise(EX_BENCH)]
    const out = mergeQueuedSets(exercises, [], [makeQueued('q1', SESSION, EX_BENCH, 1)], SESSION)
    expect(out[0].sets).toHaveLength(1)
    expect(out[0].sets[0].id).toBe('offline_q1')
    expect(out[0].sets[0].weight_kg).toBe(100)
    expect(out[0].sets[0].calculated_1rm).not.toBeNull()
  })

  it('фильтрует записи чужих сессий', () => {
    const exercises = [makeExercise(EX_BENCH)]
    const other = makeQueued('q1', 'dddddddd-dddd-dddd-dddd-dddddddddddd', EX_BENCH, 1)
    expect(mergeQueuedSets(exercises, [], [other], SESSION)).toBe(exercises)
  })

  it('дедуплицирует по (exerciseId, setNumber) против серверных сетов', () => {
    const exercises = [makeExercise(EX_BENCH, [makeServerSet(EX_BENCH, 1)])]
    const out = mergeQueuedSets(exercises, [], [makeQueued('q1', SESSION, EX_BENCH, 1)], SESSION)
    expect(out[0].sets).toHaveLength(1)
    expect(out[0].sets[0].id).toBe(`srv_${EX_BENCH}_1`)
  })

  it('добавляет упражнение из allExercises, если его нет в сессии', () => {
    const squat = { id: EX_SQUAT, name: 'Squat', name_ru: 'Присед' } as unknown as Exercise
    const out = mergeQueuedSets(
      [makeExercise(EX_BENCH)],
      [squat],
      [makeQueued('q1', SESSION, EX_SQUAT, 1)],
      SESSION,
    )
    expect(out).toHaveLength(2)
    expect(out[1].id).toBe(EX_SQUAT)
    expect(out[1].sets[0].id).toBe('offline_q1')
  })

  it('пропускает записи с неизвестным exerciseId', () => {
    const out = mergeQueuedSets(
      [makeExercise(EX_BENCH)],
      [],
      [makeQueued('q1', SESSION, EX_SQUAT, 1)],
      SESSION,
    )
    expect(out).toHaveLength(1)
    expect(out[0].sets).toHaveLength(0)
  })

  it('bodyweight (weight 0) — calculated_1rm null', () => {
    const out = mergeQueuedSets(
      [makeExercise(EX_BENCH)],
      [],
      [makeQueued('q1', SESSION, EX_BENCH, 1, 0)],
      SESSION,
    )
    expect(out[0].sets[0].calculated_1rm).toBeNull()
  })
})

describe('hasQueuedFinish', () => {
  const rec = (sessionId: string): QueuedFinishRecord => ({
    id: 'f1',
    sessionId,
    queuedAt: 1789000000000,
  })

  it('true, когда finish этой сессии в очереди', () => {
    expect(hasQueuedFinish([rec(SESSION)], SESSION)).toBe(true)
  })

  it('false для пустой очереди и чужих сессий', () => {
    expect(hasQueuedFinish([], SESSION)).toBe(false)
    expect(hasQueuedFinish([rec('dddddddd-dddd-dddd-dddd-dddddddddddd')], SESSION)).toBe(false)
  })
})
