import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FloatingInput } from './FloatingInput'

function Icon() {
  return <svg aria-hidden="true" />
}

describe('FloatingInput', () => {
  it('associates its label and error with the input', () => {
    render(<FloatingInput name="email" label="Email" icon={Icon} error="Invalid email" />)

    const input = screen.getByLabelText('Email')
    const alert = screen.getByRole('alert')
    expect(input).toHaveAttribute('aria-describedby', alert.id)
  })

  it('omits error attributes when the field is valid', () => {
    render(<FloatingInput name="email" label="Email" icon={Icon} />)

    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-describedby')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
