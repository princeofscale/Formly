export interface PrefillSource {
  title?: string
  body?: string
  evidence?: string
}

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * Собирает вопрос для кнопки «Почему так?». Совет коуча даёт и заголовок, и
 * текст; пункт разбора тренировки — только текст. Цитируется то, что есть,
 * поэтому одна функция обслуживает оба места.
 */
export function buildPrefillQuestion(source: PrefillSource): string {
  const title = oneLine(source.title ?? '')
  const body = oneLine(source.body ?? '')
  const evidence = oneLine(source.evidence ?? '')

  const quoted = title || body
  if (!quoted) return ''

  let question = `Почему «${quoted}»?`
  if (title && body) question += ` ${body}`
  if (evidence) question += ` (${evidence})`

  return question
}
