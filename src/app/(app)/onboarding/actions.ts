'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { getTranslations } from 'next-intl/server'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { createTemplate } from '@/lib/db/templates'
import { WORKOUT_PRESETS } from '@/lib/constants/workout-presets'
import type { TemplateExercise } from '@/lib/types/models'

export type OnboardingGoal = 'strength' | 'hypertrophy' | 'general'
export type OnboardingLocation = 'gym' | 'home_dumbbells' | 'home_bodyweight'

// Map (goal, days/week) -> preferred preset program id
function pickProgram(goal: OnboardingGoal, daysPerWeek: number): string {
  if (daysPerWeek <= 2) return 'fullbody'
  if (daysPerWeek === 3) return goal === 'strength' ? 'ppl' : 'fullbody'
  if (daysPerWeek === 4) return 'upperlower'
  return goal === 'strength' ? 'ppl' : 'split5'
}

// Distribute training days across the week, starting Mon
function distributeDays(count: number): number[] {
  // ISO days 1=Mon..7=Sun
  const all = [1, 2, 3, 4, 5, 6, 7]
  if (count >= 7) return all
  if (count <= 0) return []
  // Spread evenly: e.g. 3 → Mon, Wed, Fri
  const step = 7 / count
  const result: number[] = []
  for (let i = 0; i < count; i++) {
    const day = Math.min(7, Math.max(1, Math.round(1 + i * step)))
    if (!result.includes(day)) result.push(day)
  }
  return result.sort((a, b) => a - b)
}

export async function finishOnboardingAction(formData: FormData): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()

  const goalRaw = formData.get('goal')?.toString()
  const locationRaw = formData.get('location')?.toString()
  const daysRaw = formData.get('days')?.toString()

  const goal: OnboardingGoal =
    goalRaw === 'strength' || goalRaw === 'hypertrophy' ? goalRaw : 'general'
  const location: OnboardingLocation =
    locationRaw === 'home_dumbbells' || locationRaw === 'home_bodyweight'
      ? locationRaw
      : 'gym'
  const days = Math.max(1, Math.min(7, parseInt(daysRaw ?? '3', 10) || 3))

  // 1. Update profile with the schedule. Location enum in DB is gym/home/both,
  //    so collapse our finer-grained UI options into that.
  const schedule = distributeDays(days)
  const dbLocation: 'gym' | 'home' = location === 'gym' ? 'gym' : 'home'
  await supabase
    .from('profiles')
    .update({
      training_schedule: schedule,
      training_location: dbLocation,
    })
    .eq('id', user.id)

  // 2. Pick a program & seed templates from it (one template per day)
  const programId = pickProgram(goal, days)
  const program = WORKOUT_PRESETS.find(p => p.id === programId)

  if (program) {
    // Collect all exercise slugs used across all days of the program
    const allSlugs = Array.from(new Set(program.days.flatMap(d => d.slugs)))
    const { data: exData } = await supabase
      .from('exercises')
      .select('id, slug, name, name_ru')
      .in('slug', allSlugs)

    const bySlug = new Map(
      ((exData ?? []) as Array<{ id: string; slug: string; name: string; name_ru: string | null }>).map(
        e => [e.slug, e],
      ),
    )

    // Localized preset titles
    const tPresets = await getTranslations('presets')
    const programTitle = tPresets(`${program.id}.title`)

    for (const day of program.days) {
      const exercises: TemplateExercise[] = []
      for (const slug of day.slugs) {
        const ex = bySlug.get(slug)
        if (ex) {
          exercises.push({ exercise_id: ex.id, name: ex.name, name_ru: ex.name_ru })
        }
      }
      if (exercises.length === 0) continue
      const dayTitle = tPresets(day.titleKey)
      const name = `${programTitle} · ${dayTitle}`
      try {
        await createTemplate(supabase, user.id, name, exercises)
      } catch {
        // Likely unique-name collision on retry — safe to ignore.
      }
    }
  }

  revalidatePath('/dashboard')
  revalidatePath('/workout/new')
  redirect('/workout/new')
}

export async function skipOnboardingAction(): Promise<void> {
  const { user } = await verifySession()
  const supabase = await createClient()
  // Mark schedule as "explicitly empty" so dashboard knows not to bounce them back
  await supabase
    .from('profiles')
    .update({ training_schedule: [] })
    .eq('id', user.id)
  revalidatePath('/dashboard')
  redirect('/dashboard')
}
