export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      <div className="h-9 w-32 rounded-xl bg-white/5 animate-pulse" />
      <div className="h-14 w-full rounded-xl bg-white/5 animate-pulse" />
      <div className="grid grid-cols-3 gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
        ))}
      </div>
      <div className="h-32 rounded-xl bg-white/5 animate-pulse" />
      <div className="h-48 rounded-xl bg-white/5 animate-pulse" />
    </div>
  )
}
