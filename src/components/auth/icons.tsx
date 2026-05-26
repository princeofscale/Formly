import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export const MailIcon = (p: IconProps) => (
  <svg
    {...p}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="m3 7 9 6 9-6" />
  </svg>
)

export const LockIcon = (p: IconProps) => (
  <svg
    {...p}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="4" y="11" width="16" height="10" rx="3" />
    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
  </svg>
)

export const ShieldIcon = (p: IconProps) => (
  <svg
    {...p}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
)

export const EyeIcon = (p: IconProps) => (
  <svg
    {...p}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

export const EyeOffIcon = (p: IconProps) => (
  <svg
    {...p}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M3 3l18 18" />
    <path d="M10.6 6.1A10.4 10.4 0 0 1 12 6c6.5 0 10 6 10 6a17.3 17.3 0 0 1-3.2 4M6.6 6.6C3.7 8.6 2 12 2 12s3.5 7 10 7c1.6 0 3.1-.4 4.4-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </svg>
)

export const CheckIcon = (p: IconProps) => (
  <svg
    {...p}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 5 5L20 7" />
  </svg>
)

export const ArrowIcon = (p: IconProps) => (
  <svg
    {...p}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 5l7 7-7 7" />
  </svg>
)

export const AlertIcon = (p: IconProps) => (
  <svg
    {...p}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
)
