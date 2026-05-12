import { Mistral } from '@mistralai/mistralai'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BATCH_SIZE = 5

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! })

interface ExerciseRow {
  id: string
  instructions_en: string
}

async function translateBatch(exercises: ExerciseRow[]): Promise<Record<string, string>> {
  const parts = exercises.map((e, i) =>
    `### ${i + 1}\n${e.instructions_en}`
  ).join('\n\n')

  const response = await mistral.chat.complete({
    model: 'mistral-medium-3-5',
    maxTokens: 4096,
    messages: [
      {
        role: 'user',
        content: `Переведи инструкции к упражнениям с английского на русский. Сохраняй повелительное наклонение и спортивную терминологию. Переводи точно, без добавлений.

Верни ТОЛЬКО JSON без markdown: {"1": "перевод первого", "2": "перевод второго", ...}

${parts}`,
      },
    ],
  })

  const text = (response.choices?.[0]?.message?.content as string ?? '').trim()
  const json = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(json)
}

async function main() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
  console.log(`Переводим инструкции для ${exercises.length} упражнений, ${totalBatches} батчей по ${BATCH_SIZE}\n`)

  let translated = 0
  let failed = 0

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE) as ExerciseRow[]
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    process.stdout.write(`  [${batchNum}/${totalBatches}] `)

    let translations: Record<string, string>
    try {
      translations = await translateBatch(batch)
    } catch (err: any) {
      console.error(`ОШИБКА: ${err?.message ?? err}`)
      failed += batch.length
      await new Promise(r => setTimeout(r, 3000))
      continue
    }

    let batchOk = 0
    for (let j = 0; j < batch.length; j++) {
      const ruText = translations[String(j + 1)]
      if (!ruText) { failed++; continue }

      const { error: updateErr } = await supabase
        .from('exercises')
        .update({ instructions_ru: ruText })
        .eq('id', batch[j].id)

      if (updateErr) { failed++ } else { translated++; batchOk++ }
    }
    console.log(`${batchOk} ок  (всего: ${translated})`)

    // небольшая пауза между батчами
    if (i + BATCH_SIZE < exercises.length) {
      await new Promise(r => setTimeout(r, 500))
    }
  }

  console.log(`\n✅ Готово: переведено ${translated}, ошибок ${failed}.`)
}

main().catch(console.error)
