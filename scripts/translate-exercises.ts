import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BATCH_SIZE = 50

interface ExerciseRow {
  id: string
  name: string
}

async function translateBatch(client: Anthropic, exercises: ExerciseRow[]): Promise<Record<string, string>> {
  const list = exercises.map((e, i) => `${i + 1}. ${e.name}`).join('\n')

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: `Translate these fitness exercise names from English to Russian.
Use standard Russian fitness/gym terminology (e.g., "Bench Press" → "Жим лёжа", "Squat" → "Приседания", "Deadlift" → "Становая тяга").
Return ONLY a JSON object mapping the exercise number to Russian name, e.g. {"1": "Жим лёжа", "2": "Приседания"}.
No markdown, no explanation, just the JSON.

${list}`,
    }],
  })

  const text = (msg.content[0] as { text: string }).text.trim()
  const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(json)
}

async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name')
    .is('name_ru', null)
    .order('name')

  if (error) throw error
  if (!exercises || exercises.length === 0) {
    console.log('All exercises already translated.')
    return
  }

  console.log(`Translating ${exercises.length} exercises in batches of ${BATCH_SIZE}...`)
  let translated = 0

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE)
    console.log(`  Batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(exercises.length / BATCH_SIZE)}...`)

    const translations = await translateBatch(anthropic, batch)

    for (let j = 0; j < batch.length; j++) {
      const ruName = translations[String(j + 1)]
      if (!ruName) {
        console.warn(`  Missing translation for: ${batch[j].name}`)
        continue
      }

      const { error: updateErr } = await supabase
        .from('exercises')
        .update({ name_ru: ruName })
        .eq('id', batch[j].id)

      if (updateErr) {
        console.error(`  Error updating ${batch[j].name}:`, updateErr.message)
      } else {
        translated++
      }
    }

    if (i + BATCH_SIZE < exercises.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\nDone: ${translated} exercises translated to Russian.`)
}

main().catch(console.error)
