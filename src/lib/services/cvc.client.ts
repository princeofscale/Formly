/**
 * Chat client for the CheapVibeCode gateway (https://cheapvibecode.ru).
 *
 * The gateway speaks the OpenAI chat-completions protocol, so this is a `fetch`
 * and a response shape rather than a dependency: the whole surface Formly uses
 * is one POST with a system prompt, a user prompt and `json_object` mode.
 *
 * Every AI surface in Formly runs through here — the dashboard coach card, the
 * program generator, post-workout debriefs, the coach thread, exercise swaps,
 * search suggestions and the push hook.
 */

/** Grok 4.5 by way of the gateway. Reasoning model: expect seconds, not milliseconds. */
export const CVC_MODEL = 'grok-4.5'

const DEFAULT_BASE_URL = 'https://cheapvibecode.ru/v1'

/** A turn in an ongoing exchange. The system prompt is not one of these. */
export interface CvcMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface CvcChatOptions {
  system: string
  user: string
  /**
   * Turns to append after `user`, for the one surface that is a conversation
   * rather than a single question. Omitted everywhere else.
   */
  messages?: readonly CvcMessage[]
  /** Ceiling on the visible reply. Reasoning tokens are not counted here. */
  maxTokens: number
  temperature: number
  /** Abandon the request after this long, so a stalled gateway cannot hold the function open. */
  timeoutMs?: number
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>
}

/** Tolerates both a plain string and the parts array some gateways return. */
function contentToText(content: unknown): string {
  if (typeof content === 'string') return content
  if (!Array.isArray(content)) return ''
  return content
    .map((part) => {
      if (typeof part === 'string') return part
      if (!part || typeof part !== 'object' || !('text' in part)) return ''
      return typeof part.text === 'string' ? part.text : ''
    })
    .join('')
}

/**
 * Sends one completion and returns the reply text.
 *
 * Throws on a missing key, a non-2xx status or a timeout. Callers turn that
 * into something the athlete can act on; the message never carries the key or
 * the prompt.
 */
export async function cvcChat(options: CvcChatOptions): Promise<string> {
  const apiKey = process.env.CVC_API_KEY
  if (!apiKey) throw new Error('CVC_API_KEY is not configured')
  const baseUrl = (process.env.CVC_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, '')

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CVC_MODEL,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
        ...(options.messages ?? []),
      ],
    }),
    signal: AbortSignal.timeout(options.timeoutMs ?? 55_000),
  })

  if (!response.ok) {
    // Status only. A gateway error body can echo the request back, and the
    // request carries the athlete's training history.
    throw new Error(`CVC gateway returned ${response.status}`)
  }

  const body = (await response.json()) as ChatCompletionResponse
  return contentToText(body.choices?.[0]?.message?.content)
}
