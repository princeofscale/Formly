import { Mistral } from '@mistralai/mistralai'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const BATCH_SIZE = 50

const mistral = new Mistral({ apiKey: process.env.MISTRAL_API_KEY! })

interface ExerciseRow {
  id: string
  name: string
}

async function translateBatch(exercises: ExerciseRow[]): Promise<Record<string, string>> {
  const list = exercises.map((e, i) => `${i + 1}. ${e.name}`).join('\n')

  const response = await mistral.chat.complete({
    model: 'mistral-medium-3-5',
    maxTokens: 2048,
    messages: [
      {
        role: 'user',
        content: `Переведи названия упражнений с английского на русский, используя стандартную терминологию фитнеса/спортзала.
Примеры: "Bench Press"→"Жим лёжа", "Squat"→"Приседания", "Deadlift"→"Становая тяга", "Pull-Up"→"Подтягивания", "Curl"→"Сгибание", "Extension"→"Разгибание", "Row"→"Тяга", "Press"→"Жим", "Raise"→"Подъём", "Fly"→"Разводка", "Lunge"→"Выпад", "Plank"→"Планка", "Crunch"→"Скручивание".

Верни ТОЛЬКО JSON без markdown и пояснений: {"1": "Жим лёжа", "2": "Приседания", ...}

${list}`,
      },
    ],
  })

  const text = ((response.choices?.[0]?.message?.content as string) ?? '').trim()
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

  // Reset all existing translations first for a clean run
  console.log('Сбрасываем старые переводы...')
  const { error: resetErr } = await supabase
    .from('exercises')
    .update({ name_ru: null })
    .not('name_ru', 'is', null)
  if (resetErr) throw resetErr

  const { data: exercises, error } = await supabase
    .from('exercises')
    .select('id, name')
    .is('name_ru', null)
    .order('name')

  if (error) throw error
  if (!exercises || exercises.length === 0) {
    console.log('Упражнений не найдено.')
    return
  }

  const totalBatches = Math.ceil(exercises.length / BATCH_SIZE)
  console.log(`Переводим ${exercises.length} упражнений, ${totalBatches} батчей по ${BATCH_SIZE}\n`)

  let translated = 0
  let failed = 0

  for (let i = 0; i < exercises.length; i += BATCH_SIZE) {
    const batch = exercises.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    process.stdout.write(`  [${batchNum}/${totalBatches}] `)

    let translations: Record<string, string>
    try {
      translations = await translateBatch(batch)
    } catch (err: unknown) {
      console.error(`ОШИБКА: ${err instanceof Error ? err.message : String(err)}`)
      failed += batch.length
      await new Promise((r) => setTimeout(r, 2000))
      continue
    }

    let batchOk = 0
    for (let j = 0; j < batch.length; j++) {
      const ruName = translations[String(j + 1)]
      if (!ruName) {
        failed++
        continue
      }

      const { error: updateErr } = await supabase
        .from('exercises')
        .update({ name_ru: ruName })
        .eq('id', batch[j].id)

      if (updateErr) {
        failed++
      } else {
        translated++
        batchOk++
      }
    }
    console.log(`${batchOk} ок  (всего: ${translated})`)
  }

  console.log(`\n✅ Готово: переведено ${translated}, ошибок ${failed}.`)
}

main().catch(console.error)
