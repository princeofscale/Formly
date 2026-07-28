import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { cvcChat } from '../src/lib/services/cvc.client'

dotenv.config({ path: '.env.local' })

const BATCH_SIZE = 5

interface ExerciseRow {
  id: string
  instructions_en: string
}

async function translateBatch(exercises: ExerciseRow[]): Promise<Record<string, string>> {
  const parts = exercises.map((e, i) => `### ${i + 1}\n${e.instructions_en}`).join('\n\n')

  const text = (
    await cvcChat({
      system: 'Ты переводчик спортивной терминологии. Возвращай только JSON.',
      maxTokens: 4096,
      temperature: 0.2,
      // Catalog backfill, not a web request: the default ceiling is far too low
      // for a reasoning model writing five sets of instructions.
      timeoutMs: 180_000,
      user: `Переведи инструкции к упражнениям с английского на русский. Сохраняй повелительное наклонение и спортивную терминологию. Переводи точно, без добавлений.

Верни ТОЛЬКО JSON без markdown: {"1": "перевод первого", "2": "перевод второго", ...}

${parts}`,
    })
  ).trim()
  const json = text
    .replace(/^```json?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
  return JSON.parse(json)
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, instructions_en')
    .is('instructions_ru', null)
    .not('instructions_en', 'is', null)
    .order('name')

  if (error) throw error
  if (!exercises || exercises.length === 0) {
    console.log('Нет инструкций для перевода.')
    return
  }

  const totalBatches = Math.ceil(exercises.length / BATCH_SIZE)
  console.log(
    `Переводим инструкции для ${exercises.length} упражнений, ${totalBatches} батчей по ${BATCH_SIZE}\n`,
  )

  let translated = 0
  let failed = 0

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE) as ExerciseRow[]
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    process.stdout.write(`  [${batchNum}/${totalBatches}] `)

    let translations: Record<string, string>
    try {
      translations = await translateBatch(batch)
    } catch (err: unknown) {
      console.error(`ОШИБКА: ${err instanceof Error ? err.message : String(err)}`)
      failed += batch.length
      await new Promise((r) => setTimeout(r, 3000))
      continue
    }

    let batchOk = 0
    for (let j = 0; j < batch.length; j++) {
      const ruText = translations[String(j + 1)]
      if (!ruText) {
        failed++
        continue
      }

      const { error: updateErr } = await supabase
        .from('exercises')
        .update({ instructions_ru: ruText })
        .eq('id', batch[j].id)

      if (updateErr) {
        failed++
      } else {
        translated++
        batchOk++
      }
    }
    console.log(`${batchOk} ок  (всего: ${translated})`)

    // небольшая пауза между батчами
    if (i + BATCH_SIZE < exercises.length) {
      await new Promise((r) => setTimeout(r, 500))
    }
  }

  console.log(`\n✅ Готово: переведено ${translated}, ошибок ${failed}.`)
}

main().catch(console.error)
