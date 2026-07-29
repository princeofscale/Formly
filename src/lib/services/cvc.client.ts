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

/**
 * For surfaces where waiting costs more than wording does.
 *
 * Measured against the reasoning model on the same prompts: search suggestions
 * 4s vs 21s and a push line 2s vs 20-48s, with the same picks and roughly a
 * thirtieth of the output tokens, because reasoning tokens are billed as
 * completion. Nothing here judges training data — one picks catalog rows, the
 * other writes one sentence — so there is no reasoning to pay for.
 */
export const CVC_FAST_MODEL = 'claude-haiku-4-5'

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
  /** Defaults to the reasoning model. Pass `CVC_FAST_MODEL` where the wait is the cost. */
  model?: string
  /**
   * Which screen is asking, for the log line. Required so every call has to
   * name itself: a latency figure nobody can attribute to a surface is not
   * worth recording.
   */
  surface: string
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: unknown } }>
  usage?: { prompt_tokens?: number; completion_tokens?: number }
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
 * Removes a markdown code fence around the reply.
 *
 * `response_format: json_object` is a request, not a guarantee: the gateway
 * forwards it, and several models answer with the object wrapped in ```json
 * anyway. Every caller parses this text as JSON, so the fence comes off once
 * here rather than in seven `JSON.parse` call sites — two of which turn a
 * parse failure into an error the athlete reads.
 *
 * The closing fence is optional on purpose: `maxTokens` can cut it off, and a
 * reply that is otherwise complete should still parse.
 */
function stripFence(text: string): string {
  const trimmed = text.trim()
  if (!trimmed.startsWith('```')) return trimmed
  return trimmed
    .replace(/^```[a-z]*[ \t]*\r?\n?/i, '')
    .replace(/\r?\n?```$/, '')
    .trim()
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
  const model = options.model ?? CVC_MODEL
  const startedAt = Date.now()
  // Surface, model, wall time and token counts only — never the prompt or the
  // reply, both of which carry training history. Reasoning tokens are billed as
  // completion tokens, so `out` is the one number that shows what a screen
  // actually costs; a one-sentence push line measured at 6947 of them.
  const log = (outcome: string) =>
    `[cvc] ${options.surface} model=${model} ${Date.now() - startedAt}ms ${outcome}`

  let response: Response
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
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
  } catch (e) {
    // A timeout reaches the caller as a generic failure. This line is the only
    // place it is visible as a timeout, which is the failure worth seeing.
    // Read `.name` rather than testing `instanceof Error`: AbortSignal.timeout
    // throws a DOMException, and instanceof does not survive a realm boundary.
    console.warn(log(`failed=${(e as Error | null)?.name ?? 'unknown'}`))
    throw e
  }

  if (!response.ok) {
    // Status only. A gateway error body can echo the request back, and the
    // request carries the athlete's training history.
    console.warn(log(`http=${response.status}`))
    throw new Error(`CVC gateway returned ${response.status}`)
  }

  const body = (await response.json()) as ChatCompletionResponse
  console.info(
    log(`in=${body.usage?.prompt_tokens ?? '?'} out=${body.usage?.completion_tokens ?? '?'}`),
  )
  return stripFence(contentToText(body.choices?.[0]?.message?.content))
}
