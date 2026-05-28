import type { SVGProps } from 'react'
import type { MuscleGroup } from '@/lib/types/models'

type IconProps = SVGProps<SVGSVGElement>

function ChestIcon(p: IconProps) {
  return (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path
        d="M3 9c2-2 5-3 9-3s7 1 9 3v3a4 4 0 0 1-4 4h-2.5a2.5 2.5 0 0 1-2.5-2.5V12h-2v1.5A2.5 2.5 0 0 1 7.5 16H5a4 4 0 0 1-4-4V9Z"
        transform="translate(1)"
      />
    </svg>
  )
}

function ArmIcon(p: IconProps) {
  return (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 4h6c2 0 3 1 3 3v2c0 4-2 6-4 8l-2 3-3-3c-2-2-3-4-3-7V7c0-2 1-3 3-3Z" />
    </svg>
  )
}

function BackIcon(p: IconProps) {
  return (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v18M5 6c2 1 4 2 7 2s5-1 7-2M5 18c2-1 4-2 7-2s5 1 7 2" />
    </svg>
  )
}

function LegsIcon(p: IconProps) {
  return (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 3h6v6l-1 12h-2l-.5-8h-1l-.5 8h-2L8 9V3Z" transform="translate(-.5)" />
    </svg>
  )
}

function ShouldersIcon(p: IconProps) {
  return (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="6" cy="10" r="3.5" />
      <circle cx="18" cy="10" r="3.5" />
      <path d="M6 13c0 3 2 5 6 5s6-2 6-5" />
    </svg>
  )
}

function CoreIcon(p: IconProps) {
  return (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="7" y="4" width="10" height="16" rx="3" />
      <path d="M9 9h6M9 13h6M9 17h6" />
    </svg>
  )
}

function CardioIcon(p: IconProps) {
  return (
    <svg
      {...p}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

const MAP: Record<MuscleGroup, (p: IconProps) => React.JSX.Element> = {
  chest: ChestIcon,
  back: BackIcon,
  lats: BackIcon,
  traps: BackIcon,
  biceps: ArmIcon,
  triceps: ArmIcon,
  forearms: ArmIcon,
  core: CoreIcon,
  quads: LegsIcon,
  hamstrings: LegsIcon,
  glutes: LegsIcon,
  calves: LegsIcon,
  front_delts: ShouldersIcon,
  side_delts: ShouldersIcon,
  rear_delts: ShouldersIcon,
  cardio: CardioIcon,
}

export function MuscleIcon({ muscle, ...rest }: { muscle: MuscleGroup } & IconProps) {
  const Cmp = MAP[muscle] ?? ChestIcon
  return <Cmp {...rest} />
}
