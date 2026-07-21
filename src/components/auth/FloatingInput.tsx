'use client'

import {
  forwardRef,
  useState,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type ReactNode,
  type ComponentType,
  type SVGProps,
} from 'react'
import { AlertIcon } from './icons'

interface RightAction {
  icon: ReactNode
  onClick: () => void
  ariaLabel: string
}

interface FloatingInputProps {
  name: string
  label: string
  type?: 'text' | 'email' | 'password'
  icon: ComponentType<SVGProps<SVGSVGElement>>
  autoComplete?: string
  required?: boolean
  defaultValue?: string
  error?: string | null
  rightAction?: RightAction
  capsLockLabel?: string
  onValueChange?: (v: string) => void
  /** Treat field as a password (enables caps-lock indicator + right-action slot). Use when `type` toggles between text/password */
  isPassword?: boolean
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
  function FloatingInput(
    {
      name,
      label,
      type = 'text',
      icon: Icon,
      autoComplete,
      required,
      defaultValue = '',
      error,
      rightAction,
      capsLockLabel = 'Caps',
      onValueChange,
      isPassword,
    },
    forwardedRef,
  ) {
    const errorId = `${name}-error`
    const [focused, setFocused] = useState(false)
    const [filled, setFilled] = useState(Boolean(defaultValue))
    const [caps, setCaps] = useState(false)
    const localRef = useRef<HTMLInputElement>(null)
    useImperativeHandle(forwardedRef, () => localRef.current as HTMLInputElement)

    const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
      if (isPassword || type === 'password') {
        const state = e.getModifierState && e.getModifierState('CapsLock')
        setCaps(Boolean(state))
      }
    }

    const cls = [
      'tar-field',
      focused && 'focused',
      filled && 'filled',
      error && 'error',
      caps && 'caps',
    ]
      .filter(Boolean)
      .join(' ')

    return (
      <div className={cls}>
        <div className="tar-field-shell">
          <Icon className="tar-field-icon" />
          <input
            ref={localRef}
            id={name}
            name={name}
            autoComplete={autoComplete}
            required={required}
            className="tar-input"
            type={type}
            defaultValue={defaultValue}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              setFocused(false)
              setFilled(Boolean(e.target.value))
            }}
            onChange={(e) => {
              setFilled(Boolean(e.target.value))
              onValueChange?.(e.target.value)
            }}
            onKeyDown={handleKey}
            onKeyUp={handleKey}
            placeholder=" "
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : undefined}
          />
          <label htmlFor={name} className="tar-label">
            {label}
          </label>
          {(isPassword || type === 'password') && <span className="tar-caps">{capsLockLabel}</span>}
          {rightAction && (
            <button
              type="button"
              className="tar-field-action"
              onClick={rightAction.onClick}
              aria-label={rightAction.ariaLabel}
            >
              {rightAction.icon}
            </button>
          )}
        </div>
        {error && (
          <div id={errorId} className="tar-fielderr" role="alert">
            <AlertIcon style={{ width: 12, height: 12, flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}
      </div>
    )
  },
)
