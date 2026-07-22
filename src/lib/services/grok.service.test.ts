import { describe, expect, it } from 'vitest'
import { parseInsightsResponse } from './grok.service'

describe('parseInsightsResponse', () => {
  it('keeps valid actionable insights and caps the response at five', () => {
    const item = {
      type: 'today',
      title: 'Жим сегодня',
      body: 'Объём груди ниже цели.',
      detail: '6 из 10 подходов',
      action: 'Добавь два рабочих подхода жима.',
    }
    const result = parseInsightsResponse(JSON.stringify({ items: Array(6).fill(item) }))

    expect(result).toHaveLength(5)
    expect(result[0].action).toBe(item.action)
  })

  it('rejects a response without usable insights', () => {
    expect(() => parseInsightsResponse('{"items":[{"type":"unknown"}]}')).toThrow(
      'no valid insights',
    )
  })
})
