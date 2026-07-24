import { describe, it, expect } from 'vitest'
import { trimConversation } from './coach'
import type { CoachMessage } from './coach'

function msg(i: number, role: CoachMessage['role'] = 'user'): CoachMessage {
  return {
    id: String(i),
    role,
    body: `сообщение ${i}`,
    evidence: null,
    created_at: `2026-07-25T10:${String(i).padStart(2, '0')}:00`,
  }
}

describe('trimConversation', () => {
  it('returns everything when the thread is shorter than the limit', () => {
    const out = trimConversation([msg(1), msg(2)], 20)
    expect(out.map((m) => m.body)).toEqual(['сообщение 1', 'сообщение 2'])
  })

  it('keeps the most recent messages, not the oldest', () => {
    const all = [msg(1), msg(2), msg(3), msg(4), msg(5)]
    const out = trimConversation(all, 2)
    expect(out.map((m) => m.body)).toEqual(['сообщение 4', 'сообщение 5'])
  })

  it('preserves chronological order after trimming', () => {
    const out = trimConversation([msg(1), msg(2), msg(3)], 2)
    expect(out[0].created_at < out[1].created_at).toBe(true)
  })

  it('returns an empty array for an empty thread', () => {
    expect(trimConversation([], 20)).toEqual([])
  })

  it('does not mutate the thread it was given', () => {
    const all = [msg(1), msg(2), msg(3)]
    trimConversation(all, 1)
    expect(all).toHaveLength(3)
  })
})
