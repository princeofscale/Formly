/**
 * Muscle labels used in AI reminder copy, mapped to the `muscle_group` enum
 * values that actually appear on sets.
 *
 * The mapping exists because the two vocabularies drifted: `shoulders` was
 * removed from the enum in 20260509000004 in favour of front/side/rear delts,
 * and `lats` is a separate value from `back`. Looking a label up directly in
 * the set counts therefore missed every time, and the label was reported as
 * untrained to every athlete on every run.
 */
const MUSCLE_SOURCES: Readonly<Record<string, readonly string[]>> = {
  chest: ['chest', 'chest_upper', 'chest_lower'],
  back: ['back', 'lats', 'lower_back'],
  quads: ['quads'],
  hamstrings: ['hamstrings'],
  glutes: ['glutes'],
  biceps: ['biceps'],
  triceps: ['triceps'],
  shoulders: ['front_delts', 'side_delts', 'rear_delts'],
}

/** A muscle counts as trained once it has this many sets in the window. */
export const UNDERWORKED_SET_THRESHOLD = 3

/**
 * Labels whose combined set count falls below the threshold.
 *
 * @param setsByMuscle sets per `muscle_group` value over the recent window
 */
export function underworkedMuscles(setsByMuscle: ReadonlyMap<string, number>): string[] {
  return Object.entries(MUSCLE_SOURCES)
    .filter(
      ([, sources]) =>
        sources.reduce((total, source) => total + (setsByMuscle.get(source) ?? 0), 0) <
        UNDERWORKED_SET_THRESHOLD,
    )
    .map(([label]) => label)
}
