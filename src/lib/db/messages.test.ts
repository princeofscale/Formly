import { describe, it, expect } from 'vitest'
import { groupMessagesByDay, type ThreadMessage } from './messages'

function msg(id: string, iso: string): ThreadMessage {
  return { id, sender_id: 'u', body: 'x', created_at: iso, read_at: null, is_mine: true }
}

describe('groupMessagesByDay', () => {
  it('groups consecutive messages by local calendar day, preserving order', () => {
    const groups = groupMessagesByDay([
      msg('a', '2026-07-23T09:00:00'),
      msg('b', '2026-07-23T20:00:00'),
      msg('c', '2026-07-24T08:00:00'),
    ])
    expect(groups.map((g) => g.messages.length)).toEqual([2, 1])
    expect(groups[0].messages.map((m) => m.id)).toEqual(['a', 'b'])
    expect(groups[1].messages.map((m) => m.id)).toEqual(['c'])
  })

  it('returns [] for empty input', () => {
    expect(groupMessagesByDay([])).toEqual([])
  })
})
