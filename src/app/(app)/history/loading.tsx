export default function HistoryLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-24 rounded-xl bg-white/5 animate-pulse" />
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}
