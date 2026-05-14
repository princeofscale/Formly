/**
 * Built-in workout presets. Each program contains multiple workout days.
 * Each day is a list of exercise slugs that exist in the `exercises` seed.
 */

export interface PresetDay {
  /** Short identifier used in URL/form, e.g. "fullbody-a" */
  id: string
  /** Display label key suffix: presets.<programId>.days.<dayId>.title */
  titleKey: string
  /** Exercise slugs from existing seed */
  slugs: string[]
}

export interface PresetProgram {
  id: string
  /** i18n keys: presets.<id>.title, presets.<id>.subtitle */
  titleKey: string
  subtitleKey: string
  /** Emoji icon shown on card */
  icon: string
  days: PresetDay[]
}

export const WORKOUT_PRESETS: PresetProgram[] = [
  {
    id: 'fullbody',
    titleKey: 'fullbody.title',
    subtitleKey: 'fullbody.subtitle',
    icon: '💪',
    days: [
      {
        id: 'fullbody-a',
        titleKey: 'fullbody.days.a',
        slugs: [
          'barbell-squat',
          'barbell-bench-press',
          'barbell-row',
          'barbell-overhead-press',
          'barbell-curl',
          'plank',
        ],
      },
      {
        id: 'fullbody-b',
        titleKey: 'fullbody.days.b',
        slugs: [
          'barbell-deadlift',
          'incline-dumbbell-press',
          'lat-pulldown',
          'dumbbell-lateral-raise',
          'tricep-pushdown',
          'calf-raise',
        ],
      },
    ],
  },
  {
    id: 'upperlower',
    titleKey: 'upperlower.title',
    subtitleKey: 'upperlower.subtitle',
    icon: '⚖️',
    days: [
      {
        id: 'upperlower-upper',
        titleKey: 'upperlower.days.upper',
        slugs: [
          'barbell-bench-press',
          'barbell-row',
          'barbell-overhead-press',
          'lat-pulldown',
          'barbell-curl',
          'tricep-pushdown',
        ],
      },
      {
        id: 'upperlower-lower',
        titleKey: 'upperlower.days.lower',
        slugs: [
          'barbell-squat',
          'romanian-deadlift',
          'leg-press',
          'leg-curl',
          'standing-calf-raise',
          'hanging-leg-raise',
        ],
      },
    ],
  },
  {
    id: 'ppl',
    titleKey: 'ppl.title',
    subtitleKey: 'ppl.subtitle',
    icon: '🔥',
    days: [
      {
        id: 'ppl-push',
        titleKey: 'ppl.days.push',
        slugs: [
          'barbell-bench-press',
          'incline-dumbbell-press',
          'barbell-overhead-press',
          'dumbbell-lateral-raise',
          'tricep-pushdown',
          'skull-crusher',
        ],
      },
      {
        id: 'ppl-pull',
        titleKey: 'ppl.days.pull',
        slugs: [
          'pull-up',
          'barbell-row',
          'one-arm-dumbbell-row',
          'lat-pulldown',
          'barbell-curl',
          'hammer-curl',
        ],
      },
      {
        id: 'ppl-legs',
        titleKey: 'ppl.days.legs',
        slugs: [
          'barbell-squat',
          'romanian-deadlift',
          'leg-press',
          'leg-curl',
          'standing-calf-raise',
          'hanging-leg-raise',
        ],
      },
    ],
  },
  {
    id: 'split5',
    titleKey: 'split5.title',
    subtitleKey: 'split5.subtitle',
    icon: '🏋️',
    days: [
      {
        id: 'split5-chest',
        titleKey: 'split5.days.chest',
        slugs: [
          'barbell-bench-press',
          'incline-dumbbell-press',
          'dumbbell-flyes',
          'cable-crossover',
          'dips',
          'pec-deck',
        ],
      },
      {
        id: 'split5-back',
        titleKey: 'split5.days.back',
        slugs: [
          'pull-up',
          'barbell-row',
          'one-arm-dumbbell-row',
          'lat-pulldown',
          't-bar-row',
          'hyperextension',
        ],
      },
      {
        id: 'split5-shoulders',
        titleKey: 'split5.days.shoulders',
        slugs: [
          'barbell-overhead-press',
          'arnold-press',
          'dumbbell-lateral-raise',
          'bent-over-reverse-flye',
          'front-raise',
          'barbell-shrug',
        ],
      },
      {
        id: 'split5-arms',
        titleKey: 'split5.days.arms',
        slugs: [
          'barbell-curl',
          'hammer-curl',
          'preacher-curl',
          'tricep-pushdown',
          'skull-crusher',
          'overhead-tricep-extension',
        ],
      },
      {
        id: 'split5-legs',
        titleKey: 'split5.days.legs',
        slugs: [
          'barbell-squat',
          'romanian-deadlift',
          'leg-press',
          'leg-extension',
          'leg-curl',
          'standing-calf-raise',
        ],
      },
    ],
  },
]

export function findPresetDay(dayId: string): { program: PresetProgram; day: PresetDay } | null {
  for (const program of WORKOUT_PRESETS) {
    const day = program.days.find(d => d.id === dayId)
    if (day) return { program, day }
  }
  return null
}
