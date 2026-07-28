import { aiToneBlock } from './ai-tone'
import { cvcChat } from './cvc.client'
import type { GrokContext } from './grok.service'
import type { CoachMessage } from '@/lib/db/coach'

export interface CoachReply {
  body: string
  evidence?: string
}

export interface CoachChatContext {
  locale: 'ru' | 'en'
  question: string
  conversation: readonly CoachMessage[]
  /** Компактный снимок тренировочных данных — тот же, что получает карточка коуча. */
  snapshot: GrokContext
}

/**
 * Принимает `unknown`: ответ модели может не соответствовать схеме. Непригодный
 * ответ превращается в null, а не в пустой пузырь в треде — вызывающий код
 * покажет сообщение об ошибке и не станет записывать мусор в базу.
 */
export function parseCoachReply(raw: unknown): CoachReply | null {
  if (typeof raw !== 'object' || raw === null) return null
  const record = raw as Record<string, unknown>

  if (typeof record.body !== 'string') return null
  const body = record.body.trim()
  if (!body) return null

  const evidence = typeof record.evidence === 'string' ? record.evidence.trim() : ''
  return evidence ? { body, evidence } : { body }
}

const SAFETY_BLOCK = `SAFETY:
- Never diagnose a condition and never prescribe treatment.
- If the athlete describes pain, injury, numbness or dizziness, recommend an in-person consultation with a doctor or physiotherapist and do not attempt to identify the cause yourself.
- Never give weight-loss regimes or calorie targets to anyone under 18.
- Never recommend one-rep-max attempts when the data says nothing about their technique.`

export async function askCoach(ctx: CoachChatContext): Promise<CoachReply | null> {
  const systemPrompt = `You are the training assistant of a workout tracking app, answering one athlete's question.

You may answer two kinds of question:
- About their own training data. Ground the answer in the supplied snapshot and put the exact figure in "evidence".
- General training theory. Say plainly inside the answer that it is a general recommendation not drawn from their data, and leave "evidence" out.

Never present general theory as though it came from their history.
Keep the answer under 120 words. Answer the question that was asked, with no preamble.

${SAFETY_BLOCK}

${aiToneBlock(ctx.locale)}

Return ONLY valid JSON: {"body":"<answer>","evidence":"<figure from their data, omit if none>"}`

  const history = ctx.conversation.map((m) => ({
    role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
    content: m.body,
  }))

  const rawText =
    (await cvcChat({
      system: systemPrompt,
      user: `training data:\n${JSON.stringify(ctx.snapshot)}`,
      messages: [...history, { role: 'user', content: ctx.question }],
      temperature: 0.3,
      maxTokens: 500,
    })) || '{}'
  try {
    return parseCoachReply(JSON.parse(rawText))
  } catch {
    return null
  }
}
