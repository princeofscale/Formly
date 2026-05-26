'use client'

import { useEffect, useRef } from 'react'

export function AnimatedAuthBackground() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (window.matchMedia('(hover: none)').matches) return

    let raf = 0
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width - 0.5
      const y = (e.clientY - r.top) / r.height - 0.5
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--px', `${-x * 14}px`)
        el.style.setProperty('--py', `${-y * 14}px`)
        el.style.setProperty('--mx', `${x * 22}px`)
        el.style.setProperty('--my', `${y * 22}px`)
      })
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', onMove)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div aria-hidden className="tar-bg" ref={ref}>
      <div className="tar-bg-parallax">
        <div className="tar-bg-mesh" />
        <div className="tar-bg-grid" />
        <div className="tar-orb a" />
        <div className="tar-orb b" />
        <div className="tar-orb c" />
        <div className="tar-plate p1" />
        <div className="tar-plate p2" />
      </div>
      <div className="tar-bg-vignette" />
      <div className="tar-bg-noise" />
    </div>
  )
}
