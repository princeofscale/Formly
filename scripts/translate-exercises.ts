import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Free tier: ~20 req/min, ~50 req/day. With $10 credits: 1000 req/day.
// Batch size 30, delay 4s between batches = ~15 req/min (safe for rate limit)
const BATCH_SIZE = 30
const DELAY_MS = 4000
const MAX_RETRIES = 3

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY!,
  baseURL: 'https://openrouter.ai/api/v1',
})

interface ExerciseRow {
  id: string
  name: string
}

async function translateBatch(exercises: ExerciseRow[], retries = 0): Promise<Record<string, string>> {
  const list = exercises.map((e, i) => `${i + 1}. ${e.name}`).join('\n')

  try {
    const completion = await client.chat.completions.create({
      model: 'google/gemma-4-31b-it:free',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: `Переведи названия упражнений с английского на русский. Используй стандартную терминологию фитнеса.
Примеры: "Bench Press"→"Жим лёжа", "Squat"→"Приседания", "Deadlift"→"Становая тяга", "Pull-Up"→"Подтягивания", "Curl"→"Сгибание", "Extension"→"Разгибание", "Row"→"Тяга", "Press"→"Жим", "Raise"→"Подъём", "Fly"→"Разводка".

Верни ТОЛЬКО JSON без markdown: {"1": "Жим лёжа", "2": "Приседания"}

${list}`,
      }],
    })

    const text = completion.choices[0].message.content?.trim() ?? ''
    const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
    return JSON.parse(json)
  } catch (err: any) {
    const msg = String(err?.message ?? err)
    // Rate limit — wait longer and retry
    if (msg.includes('429') && retries < MAX_RETRIES) {
      const waitMs = msg.includes('per-day') ? 0 : 30000 * (retries + 1)
      if (msg.includes('per-day')) throw new Error('DAILY_LIMIT: ' + msg)
      process.stdout.write(`[rate limit, ждём ${waitMs / 1000}s] `)
      await new Promise(r => setTimeout(r, waitMs))
      return translateBatch(exercises, retries + 1)
    }
    throw err
  }
}

async function main() {
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
    console.log('Все упражнения уже переведены.')
    return
  }

  const totalBatches = Math.ceil(exercises.length / BATCH_SIZE)
  console.log(`Осталось: ${exercises.length} упражнений, ${totalBatches} батчей по ${BATCH_SIZE}`)
  console.log(`Задержка между батчами: ${DELAY_MS / 1000}s\n`)

  let translated = 0
  let failed = 0

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    process.stdout.write(`  [${batchNum}/${totalBatches}] ${batch[0].name.substring(0, 30)}... `)

    let translations: Record<string, string>
    try {
      translations = await translateBatch(batch)
    } catch (err: any) {
      const msg = String(err?.message ?? err)
      if (msg.startsWith('DAILY_LIMIT')) {
        console.log('\n\n⛔ Дневной лимит исчерпан.')
        console.log(`Переведено в этом запуске: ${translated}`)
        console.log('Запусти скрипт завтра — продолжит с того же места.')
        console.log('Или пополни баланс OpenRouter на $10 для 1000 req/day.')
        process.exit(0)
      }
      console.error(`ОШИБКА: ${msg}`)
      failed += batch.length
      await new Promise(r => setTimeout(r, 5000))
      continue
    }

    let batchOk = 0
    for (let j = 0; j < batch.length; j++) {
      const ruName = translations[String(j + 1)]
      if (!ruName) { failed++; continue }

      const { error: updateErr } = await supabase
        .from('exercises')
        .update({ name_ru: ruName })
        .eq('id', batch[j].id)

      if (updateErr) { failed++ } else { translated++; batchOk++ }
    }
    console.log(`${batchOk} ок`)

    if (i + BATCH_SIZE < exercises.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`\n✅ Готово: переведено ${translated}, ошибок ${failed}.`)
}

main().catch(console.error)
