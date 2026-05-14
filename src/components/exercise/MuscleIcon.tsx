'use client'

import type { MuscleGroup } from '@/lib/types/models'

const ACTIVE = '#f59e0b'
const NEUTRAL = '#3f3f50'
const BODY = '#2a2a3a'
const OUTLINE = '#3f3f50'

const FRONT_MUSCLES: Set<MuscleGroup> = new Set([
  'chest', 'biceps', 'forearms', 'core', 'quads', 'calves', 'front_delts', 'side_delts',
])

interface Props {
  muscle: MuscleGroup
  size?: number
  active?: boolean
}

export function MuscleIcon({ muscle, size = 64, active = true }: Props) {
  const isBack = !FRONT_MUSCLES.has(muscle)
  const fill = (m: MuscleGroup | MuscleGroup[]) => {
    const matches = Array.isArray(m) ? m.includes(muscle) : m === muscle
    return matches && active ? ACTIVE : NEUTRAL
  }
  const height = Math.round((size * 138) / 65)

  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 65 138"
      className="overflow-visible"
      aria-hidden="true"
    >
      <ellipse cx="32.5" cy="11" rx="10" ry="10.5" fill={BODY} stroke={OUTLINE} strokeWidth="1.2" />
      <rect x="29" y="21" width="7" height="6" rx="2" fill={BODY} stroke={OUTLINE} strokeWidth="1" />
      <path
        d="M17 27 Q11 31 10 51 L10 75 Q10 79 17 79 L48 79 Q55 79 55 75 L55 51 Q54 31 48 27 Q42 24 32.5 24 Q23 24 17 27Z"
        fill={BODY}
        stroke={OUTLINE}
        strokeWidth="1.2"
      />

      <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke={BODY} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke={BODY} strokeWidth="13" strokeLinecap="round" fill="none" />
      <path d="M3 63 Q2 71 3 79 Q4 84 5 87" stroke={BODY} strokeWidth="10" strokeLinecap="round" fill="none" />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87" stroke={BODY} strokeWidth="10" strokeLinecap="round" fill="none" />

      <path d="M21 79 Q18 98 18 114 Q18 127 19 137" stroke={BODY} strokeWidth="15" strokeLinecap="round" fill="none" />
      <path d="M44 79 Q47 98 47 114 Q47 127 46 137" stroke={BODY} strokeWidth="15" strokeLinecap="round" fill="none" />

      <path d="M3 63 Q2 71 3 79 Q4 84 5 87" stroke={fill('forearms')} strokeWidth="8" strokeLinecap="round" fill="none" />
      <path d="M62 63 Q63 71 62 79 Q61 84 60 87" stroke={fill('forearms')} strokeWidth="8" strokeLinecap="round" fill="none" />

      <path d="M18 116 Q18 127 19 137" stroke={fill('calves')} strokeWidth="11" strokeLinecap="round" fill="none" />
      <path d="M47 116 Q47 127 46 137" stroke={fill('calves')} strokeWidth="11" strokeLinecap="round" fill="none" />

      {isBack ? (
        <>
          <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke={fill('triceps')} strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke={fill('triceps')} strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M21 79 Q18 98 18 112" stroke={fill('hamstrings')} strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M44 79 Q47 98 47 112" stroke={fill('hamstrings')} strokeWidth="13" strokeLinecap="round" fill="none" />
          <ellipse cx="10" cy="30" rx="8" ry="6.5" fill={fill('rear_delts')} />
          <ellipse cx="55" cy="30" rx="8" ry="6.5" fill={fill('rear_delts')} />
          <path d="M19 28 Q13 46 13 68 L52 68 Q52 46 46 28 Z" fill={fill('back')} />
          <path d="M10 33 Q7 50 10 70" stroke={fill('lats')} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M55 33 Q58 50 55 70" stroke={fill('lats')} strokeWidth="7" strokeLinecap="round" fill="none" />
          <path d="M17 27 Q32.5 21 48 27 Q40 34 32.5 35 Q25 34 17 27Z" fill={fill('traps')} />
          <ellipse cx="23" cy="80" rx="9.5" ry="7" fill={fill('glutes')} />
          <ellipse cx="42" cy="80" rx="9.5" ry="7" fill={fill('glutes')} />
        </>
      ) : (
        <>
          <path d="M10 28 Q3 35 2 47 Q1 56 3 63" stroke={fill('biceps')} strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M55 28 Q62 35 63 47 Q64 56 62 63" stroke={fill('biceps')} strokeWidth="11" strokeLinecap="round" fill="none" />
          <path d="M21 79 Q18 98 18 112" stroke={fill('quads')} strokeWidth="13" strokeLinecap="round" fill="none" />
          <path d="M44 79 Q47 98 47 112" stroke={fill('quads')} strokeWidth="13" strokeLinecap="round" fill="none" />
          <ellipse cx="10" cy="30" rx="8" ry="6.5" fill={fill(['front_delts', 'side_delts'])} />
          <ellipse cx="55" cy="30" rx="8" ry="6.5" fill={fill(['front_delts', 'side_delts'])} />
          <ellipse cx="23" cy="42" rx="10.5" ry="8" fill={fill('chest')} />
          <ellipse cx="42" cy="42" rx="10.5" ry="8" fill={fill('chest')} />
          <g>
            <rect x="27" y="52" width="5" height="4.5" rx="1.5" fill={fill('core')} />
            <rect x="33" y="52" width="5" height="4.5" rx="1.5" fill={fill('core')} />
            <rect x="27" y="58" width="5" height="4.5" rx="1.5" fill={fill('core')} opacity="0.85" />
            <rect x="33" y="58" width="5" height="4.5" rx="1.5" fill={fill('core')} opacity="0.85" />
            <rect x="27" y="64" width="5" height="4.5" rx="1.5" fill={fill('core')} opacity="0.7" />
            <rect x="33" y="64" width="5" height="4.5" rx="1.5" fill={fill('core')} opacity="0.7" />
          </g>
        </>
      )}
    </svg>
  )
}
