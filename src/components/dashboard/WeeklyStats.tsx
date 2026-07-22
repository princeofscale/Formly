// src/components/dashboard/WeeklyStats.tsx
interface Props {
  tonnage: number
  sessions: number
  bestWeight: number | null
  prevTonnage?: number
  prevSessions?: number
  labels: { tonnage: string; sessions: string; bestWeight: string }
}

function deltaLabel(
  current: number,
  previous: number | undefined,
): {
  text: string
  dir: 'up' | 'down' | 'muted'
} | null {
  if (previous === undefined || previous === 0 || current === previous) return null
  const diff = current - previous
  const pct = Math.round((diff / previous) * 100)
  const positive = diff > 0
  return {
    text: `${positive ? '↑' : '↓'} ${Math.abs(pct)}%`,
    dir: positive ? 'up' : 'down',
  }
}

export function WeeklyStats({
  tonnage,
  sessions,
  bestWeight,
  prevTonnage,
  prevSessions,
  labels,
}: Props) {
  const tonnageDelta = deltaLabel(tonnage, prevTonnage)
  const sessionsDelta = deltaLabel(sessions, prevSessions)

  return (
    <div className="tar-d-week">
      <div className="tar-d-stat">
        <div className="k">{labels.tonnage}</div>
        <div className="v">
          <span className="tabular-nums">{Math.round(tonnage).toLocaleString('ru-RU')}</span>
          <span className="u">кг</span>
        </div>
        {tonnageDelta ? (
          <div className={`d ${tonnageDelta.dir === 'down' ? 'down' : ''}`}>
            {tonnageDelta.text}
          </div>
        ) : (
          <div className="d muted">—</div>
        )}
      </div>
      <div className="tar-d-stat">
        <div className="k">{labels.sessions}</div>
        <div className="v">
          <span>{sessions}</span>
        </div>
        {sessionsDelta ? (
          <div className={`d ${sessionsDelta.dir === 'down' ? 'down' : ''}`}>
            {sessionsDelta.text}
          </div>
        ) : (
          <div className="d muted">—</div>
        )}
      </div>
      <div className="tar-d-stat">
        <div className="k">{labels.bestWeight}</div>
        <div className="v gold">
          <span>{bestWeight ? Math.round(bestWeight) : '—'}</span>
          {bestWeight ? <span className="u">кг</span> : null}
        </div>
        <div className="d muted">max</div>
      </div>
    </div>
  )
}
