export function AnimatedAuthBackground() {
  return (
    <div
      aria-hidden
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      style={{ background: '#0a0a0f' }}
    >
      {/* Three drifting gradient orbs in brand colors */}
      <div className="absolute inset-0">
        <div
          className="auth-blob-a absolute h-[55vh] w-[55vh] rounded-full will-change-transform"
          style={{
            top: '8%',
            left: '5%',
            background: 'radial-gradient(circle, rgba(255,196,68,0.32) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          className="auth-blob-b absolute h-[50vh] w-[50vh] rounded-full will-change-transform"
          style={{
            top: '40%',
            right: '0%',
            background: 'radial-gradient(circle, rgba(255,59,71,0.28) 0%, transparent 70%)',
            filter: 'blur(70px)',
          }}
        />
        <div
          className="auth-blob-c absolute h-[60vh] w-[60vh] rounded-full will-change-transform"
          style={{
            bottom: '-10%',
            left: '30%',
            background: 'radial-gradient(circle, rgba(94,234,212,0.18) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
      </div>

      {/* Subtle pulsing grid */}
      <div
        className="auth-grid absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* Slowly rotating barbell-plate silhouettes — gym vibe without
         shouting it. SVG donut shapes with very low opacity. */}
      <Plate
        className="auth-plate-a"
        style={{ top: '8%', right: '8%', width: '22vh', height: '22vh' }}
        rim="rgba(255,196,68,0.35)"
        inner="rgba(255,196,68,0.10)"
      />
      <Plate
        className="auth-plate-b"
        style={{ bottom: '12%', left: '6%', width: '28vh', height: '28vh' }}
        rim="rgba(255,59,71,0.30)"
        inner="rgba(255,59,71,0.08)"
      />
      <Plate
        className="auth-plate-c"
        style={{ top: '55%', left: '42%', width: '16vh', height: '16vh' }}
        rim="rgba(94,234,212,0.22)"
        inner="rgba(94,234,212,0.06)"
      />

      {/* Vignette to keep edges dark */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(10,10,15,0.6) 100%)',
        }}
      />
    </div>
  )
}

function Plate({
  className,
  style,
  rim,
  inner,
}: {
  className: string
  style: React.CSSProperties
  rim: string
  inner: string
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`absolute will-change-transform opacity-60 ${className}`}
      style={style}
      aria-hidden
    >
      {/* Outer rim */}
      <circle cx="50" cy="50" r="48" fill="none" stroke={rim} strokeWidth="2.5" />
      {/* Inner hub */}
      <circle cx="50" cy="50" r="14" fill="none" stroke={rim} strokeWidth="1.5" />
      {/* Center hole */}
      <circle cx="50" cy="50" r="6" fill={inner} />
      {/* Four bolt-hole accents — pure decorative gym detail */}
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180
        const x = 50 + Math.cos(rad) * 30
        const y = 50 + Math.sin(rad) * 30
        return <circle key={deg} cx={x} cy={y} r="1.5" fill={rim} />
      })}
    </svg>
  )
}
