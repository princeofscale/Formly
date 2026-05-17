export default function WorkoutNewLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-44 rounded-lg bg-white/5 animate-pulse" />
      <div
        className="h-14 rounded-[20px] animate-pulse"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      />
      <div className="space-y-2">
        <div className="h-4 w-32 rounded bg-white/5 animate-pulse" />
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className="h-16 rounded-[20px] animate-pulse"
            style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
          />
        ))}
      </div>
    </div>
  )
}
