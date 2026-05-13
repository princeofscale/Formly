export default function RecordsLoading() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-36 rounded-xl bg-white/5 animate-pulse" />
      {[0, 1, 2, 3, 4].map(i => (
        <div key={i} className="h-16 rounded-xl bg-white/5 animate-pulse" />
      ))}
    </div>
  )
}
