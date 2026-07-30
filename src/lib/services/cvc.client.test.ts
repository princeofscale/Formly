import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { cvcChat, CVC_MODEL, CVC_FAST_MODEL } from './cvc.client'

const KEY = 'sk-cvc-test'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/** The three fields every call needs, so a test only states what it is about. */
const base = { surface: 'test', system: 's', user: 'u', temperature: 0, maxTokens: 10 }

describe('cvcChat', () => {
  beforeEach(() => {
    process.env.CVC_API_KEY = KEY
    delete process.env.CVC_BASE_URL
    vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    delete process.env.CVC_API_KEY
    delete process.env.CVC_BASE_URL
  })

  it('asks the gateway for JSON from the configured model', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{"ok":true}' } }] }))
    vi.stubGlobal('fetch', fetchMock)

    const text = await cvcChat({ ...base, system: 'sys', user: 'usr', maxTokens: 900 })

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

  it('sends the model a caller asks for instead of the default', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{}' } }] }))
    vi.stubGlobal('fetch', fetchMock)

    await cvcChat({ ...base, model: CVC_FAST_MODEL })

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).model).toBe(CVC_FAST_MODEL)
    expect(CVC_FAST_MODEL).not.toBe(CVC_MODEL)
  })

  it('refuses to call out without a key', async () => {
    delete process.env.CVC_API_KEY
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(cvcChat(base)).rejects.toThrow('CVC_API_KEY is not configured')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a failure by status alone, never the body', async () => {
    // A gateway error body can echo the request, and the request carries the
    // athlete's training history.
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse({ error: 'bad key sk-cvc-secret' }, 401)),
    )

    await expect(cvcChat(base)).rejects.toThrow('CVC gateway returned 401')
    await expect(cvcChat(base)).rejects.not.toThrow(/sk-cvc-secret/)
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

    await expect(cvcChat(base)).resolves.toBe('{"a":1}')
    await expect(cvcChat(base)).resolves.toBe('')
  })

  it('unwraps a markdown fence so the reply still parses as JSON', async () => {
    // json_object mode is a request, not a guarantee: some models on the gateway
    // fence the object anyway, and every caller runs JSON.parse on this text.
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse({ choices: [{ message: { content: '```json\n{"a":1}\n```' } }] }),
        )
        // maxTokens can cut the closing fence off a reply that is otherwise whole.
        .mockResolvedValueOnce(
          jsonResponse({ choices: [{ message: { content: '```\n{"b":2}' } }] }),
        )
        // A bare object must come back untouched.
        .mockResolvedValueOnce(
          jsonResponse({ choices: [{ message: { content: '  {"c":"``` inside"}  ' } }] }),
        ),
    )

    await expect(cvcChat(base)).resolves.toBe('{"a":1}')
    await expect(cvcChat(base)).resolves.toBe('{"b":2}')
    await expect(cvcChat(base)).resolves.toBe('{"c":"``` inside"}')
  })

  it('logs what a call cost without logging what was said', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          choices: [{ message: { content: '{}' } }],
          usage: { prompt_tokens: 220, completion_tokens: 6947 },
        }),
      ),
    )

    await cvcChat({ ...base, surface: 'push_hook', system: 'SECRET-SYSTEM', user: 'SECRET-USER' })

    const line = vi.mocked(console.info).mock.calls[0][0] as string
    expect(line).toContain('push_hook')
    expect(line).toContain(`model=${CVC_MODEL}`)
    // Reasoning tokens are billed as completion tokens, so this is the number
    // that shows what a screen actually costs.
    expect(line).toContain('out=6947')
    expect(line).not.toContain('SECRET-SYSTEM')
    expect(line).not.toContain('SECRET-USER')
    expect(line).not.toContain(KEY)
  })

  it('records a timeout as a timeout before handing it to the caller', async () => {
    const timeout = new DOMException('The operation timed out.', 'TimeoutError')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeout))

    await expect(cvcChat({ ...base, surface: 'exercise_suggest' })).rejects.toBe(timeout)

    const line = vi.mocked(console.warn).mock.calls[0][0] as string
    expect(line).toContain('exercise_suggest')
    expect(line).toContain('failed=TimeoutError')
  })

  it('leaves a line behind when a 200 is not JSON', async () => {
    // The gateway sitting behind a proxy that answers 200 with an HTML error
    // page is the failure that looks like success everywhere else.
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>502</html>')))

    await expect(cvcChat({ ...base, surface: 'coach_chat' })).rejects.toThrow()

    const line = vi.mocked(console.warn).mock.calls[0][0] as string
    expect(line).toContain('coach_chat')
    expect(line).toContain('failed=')
  })

  it('honours an overridden base url without doubling the slash', async () => {
    process.env.CVC_BASE_URL = 'https://gateway.example/v1/'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ choices: [{ message: { content: '{}' } }] }))
    vi.stubGlobal('fetch', fetchMock)

    await cvcChat(base)

    expect(fetchMock.mock.calls[0][0]).toBe('https://gateway.example/v1/chat/completions')
  })
})
