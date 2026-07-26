import { describe, expect, it, vi } from 'vitest'
import { AiQuotaExceededError, consumeAiQuota } from './ai-quota.service'

describe('consumeAiQuota', () => {
  it('uses the atomic quota RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: true, count: 2, limit: 20 },
      error: null,
    })

    await consumeAiQuota({ rpc } as never, 'coach_chat')

    expect(rpc).toHaveBeenCalledWith('consume_ai_quota', { p_kind: 'coach_chat' })
  })

  it('fails closed when the RPC fails', async () => {
    const rpc = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'database unavailable' } })
    await expect(consumeAiQuota({ rpc } as never, 'coach_chat')).rejects.toThrow(
      'AI quota check failed',
    )
  })

  it('throws the quota error returned by the database', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { allowed: false, count: 20, limit: 20 },
      error: null,
    })
    await expect(consumeAiQuota({ rpc } as never, 'coach_chat')).rejects.toBeInstanceOf(
      AiQuotaExceededError,
    )
  })
})
