interface BarbellLoaderProps {
  compact?: boolean
  label?: string
}

export function BarbellLoader({ compact = false, label }: BarbellLoaderProps) {
  return (
    <div
      className="tar-loader"
      style={compact ? { width: 120, height: 28 } : undefined}
      aria-hidden
    >
      <div className="tar-loader-bar" />
      <div className="tar-loader-collar left" />
      <div className="tar-loader-collar right" />
      <div className="tar-loader-plate l1" />
      <div className="tar-loader-plate l2" />
      <div className="tar-loader-plate r1" />
      <div className="tar-loader-plate r2" />
      {!compact && label && <div className="tar-loader-meta">{label}</div>}
    </div>
  )
}
