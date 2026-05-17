export default function ProgressLoading() {
  return (
    <div className="space-y-5">
      <div className="h-8 w-32 rounded-lg bg-white/5 animate-pulse" />
      <div
        className="rounded-[20px] p-5 space-y-4"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="h-11 rounded-[10px] bg-white/5 animate-pulse" />
          <div className="h-11 rounded-[10px] bg-white/5 animate-pulse" />
        </div>
        <div className="h-56 rounded-lg bg-white/5 animate-pulse" />
      </div>
      <div
        className="rounded-[20px] p-5 h-48"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="h-full rounded-lg bg-white/5 animate-pulse" />
      </div>
      <div
        className="rounded-[20px] p-5 h-44"
        style={{ background: '#15151C', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="h-full rounded-lg bg-white/5 animate-pulse" />
      </div>
    </div>
  )
}
