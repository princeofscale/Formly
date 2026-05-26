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
