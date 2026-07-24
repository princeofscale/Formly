/**
 * Shared tone contract for every Mistral prompt in the app.
 *
 * Before this existed each service wrote its own register, and two of them
 * explicitly asked for slang ("casual gym-bro register", "sound like a gym
 * buddy"). That contradicted the product's official wording and produced a
 * different voice on every screen. Every prompt now embeds this block so the
 * assistant sounds like one assistant.
 *
 * Keep the rules negative and concrete: models follow "never do X" far more
 * reliably than "be professional".
 */
export function aiToneBlock(locale: string): string {
  const language = locale === 'ru' ? 'Russian' : 'English'

  return `TONE (applies to every word you output):
- Write entirely in ${language}.
- Neutral and factual. No slang, no gym-bro register, no hype, no motivational filler, no exclamation marks.
- No imperative commands telling the athlete what to do ("push harder", "smash it"). State what the data shows and let them decide.
- Address the athlete impersonally and use gender-neutral phrasing; never assume their gender. In Russian this means avoiding gendered past-tense verbs — prefer "результат вырос" over "ты вырос".
- Ground every statement in a number taken from the supplied data. Never invent measurements, and say nothing when the data does not support it.`
}
