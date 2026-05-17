export default function ProfileLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-32 rounded-lg bg-white/5 animate-pulse" />
      <div className="h-20 rounded-[20px] bg-white/5 animate-pulse" />
      <div
        className="h-24 rounded-[10px] animate-pulse"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      />
      {[0, 1, 2, 3].map(i => (
        <div
          key={i}
          className="h-16 rounded-[20px] animate-pulse"
          style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
        />
      ))}
    </div>
  )
}
