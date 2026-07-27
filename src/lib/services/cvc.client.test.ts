import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cvcChat, CVC_MODEL } from './cvc.client'

const KEY = 'sk-cvc-test'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('cvcChat', () => {
  beforeEach(() => {
    process.env.CVC_API_KEY = KEY
    delete process.env.CVC_BASE_URL
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.CVC_API_KEY
    delete process.env.CVC_BASE_URL
  })

  it('asks the gateway for JSON from the configured model', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] }))
    vi.stubGlobal('fetch', fetchMock)

    const text = await cvcChat({ system: 'sys', user: 'usr', temperature: 0.4, maxTokens: 900 })

    expect(text).toBe('{"ok":true}')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://cheapvibecode.ru/v1/chat/completions')
    expect(init.headers.Authorization).toBe(`Bearer ${KEY}`)
    const sent = JSON.parse(init.body)
    expect(sent.model).toBe(CVC_MODEL)
    expect(sent.max_tokens).toBe(900)
    expect(sent.response_format).toEqual({ type: 'json_object' })
    expect(sent.messages).toEqual([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'usr' },
    ])
  })

  it('refuses to call out without a key', async () => {
    delete process.env.CVC_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      cvcChat({ system: 's', user: 'u', temperature: 0, maxTokens: 10 }),
    ).rejects.toThrow('CVC_API_KEY is not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a failure by status alone, never the body', async () => {
    // A gateway error body can echo the request, and the request carries the
    // athlete's training history.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'bad key sk-cvc-secret' }, 401)),
    )

    await expect(
      cvcChat({ system: 's', user: 'u', temperature: 0, maxTokens: 10 }),
    ).rejects.toThrow('CVC gateway returned 401')
    await expect(
      cvcChat({ system: 's', user: 'u', temperature: 0, maxTokens: 10 }),
    ).rejects.not.toThrow(/sk-cvc-secret/)
  })

  it('joins a parts array and survives a reply with no content', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({
            choices: [{ message: { content: [{ text: '{"a":' }, { text: '1}' }] } }],
          }),
        )
        .mockResolvedValueOnce(jsonResponse({ choices: [] })),
    )

    await expect(cvcChat({ system: 's', user: 'u', temperature: 0, maxTokens: 10 })).resolves.toBe(
      '{"a":1}',
    )
    await expect(cvcChat({ system: 's', user: 'u', temperature: 0, maxTokens: 10 })).resolves.toBe(
      '',
    )
  })

  it('honours an overridden base url without doubling the slash', async () => {
    process.env.CVC_BASE_URL = 'https://gateway.example/v1/'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{}' } }] }))
    vi.stubGlobal('fetch', fetchMock)

    await cvcChat({ system: 's', user: 'u', temperature: 0, maxTokens: 10 })

    expect(fetchMock.mock.calls[0][0]).toBe('https://gateway.example/v1/chat/completions')
  })
})
