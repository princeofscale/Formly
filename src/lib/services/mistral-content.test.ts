import { describe, expect, it } from 'vitest'
import { mistralContentToText } from './mistral-content'

describe('mistralContentToText', () => {
  it('joins text parts and ignores unsupported content', () => {
    expect(mistralContentToText(['a', { text: 'b' }, { image: 'ignored' }])).toBe('ab')
    expect(mistralContentToText(null)).toBe('')
  })
})
