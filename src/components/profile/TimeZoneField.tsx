'use client'

import { useEffect, useRef } from 'react'

export function TimeZoneField({ current }: { current: string }) {
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (input.current) {
      input.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone || current
    }
  }, [current])

  return <input ref={input} type="hidden" name="time_zone" defaultValue={current} />
}
