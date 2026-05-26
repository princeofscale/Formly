'use client'

import { useRef, useState, type ReactNode, type MouseEvent } from 'react'
import { ArrowIcon, CheckIcon } from './icons'
import { BarbellLoader } from './BarbellLoader'

type ButtonState = 'idle' | 'loading' | 'success'

interface SubmitButtonProps {
  children: ReactNode
  /** When true, the button enters loading state. Driven by useActionState's `pending`. */
  pending?: boolean
  /** When true, the button briefly shows the success check before form's redirect / unmount. */
  success?: boolean
}

interface Ripple {
  id: number
  x: number
  y: number
  size: number
}

/**
 * Submit button with shimmer / aurora / ripple / success state.
 * Drive `pending` from useActionState. Ripples are React-managed to play
 * nice with StrictMode (no manual DOM appendChild).
 */
export function SubmitButton({ children, pending = false, success = false }: SubmitButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)
  const [ripples, setRipples] = useState<Ripple[]>([])

  const state: ButtonState = success ? 'success' : pending ? 'loading' : 'idle'

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (state !== 'idle') return
    const btn = ref.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const size = Math.max(r.width, r.height)
    const x = e.clientX - r.left - size / 2
    const y = e.clientY - r.top - size / 2
    const id = Date.now() + Math.random()
    setRipples((rs) => [...rs, { id, x, y, size }])
    setTimeout(() => setRipples((rs) => rs.filter((r) => r.id !== id)), 700)
  }

  return (
    <button
      ref={ref}
      type="submit"
      onClick={handleClick}
      className={
        'tar-btn ' + (state === 'loading' ? 'loading' : state === 'success' ? 'success' : '')
      }
      disabled={state !== 'idle'}
    >
      <span className="label">
        {children}
        <ArrowIcon className="arrow" style={{ width: 16, height: 16 }} />
      </span>
      {state === 'loading' && <BarbellLoader compact />}
      <span className="check-wrap">
        <CheckIcon style={{ width: 24, height: 24, color: '#0A0A0F' }} />
      </span>
      {ripples.map((r) => (
        <span
          key={r.id}
          className="ripple"
          style={{ left: r.x, top: r.y, width: r.size, height: r.size }}
        />
      ))}
    </button>
  )
}
