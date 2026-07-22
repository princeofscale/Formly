import type { VolumeLandmark } from '@/lib/types/models'

const STATUS_CONFIG = {
  mv: {
    color: '#FFD64A',
    bg: 'rgba(255, 214, 74, 0.12)',
    border: 'rgba(255, 214, 74, 0.32)',
  },
  optimal: {
    color: 'var(--tar-success)',
    bg: 'rgba(43, 216, 132, 0.12)',
    border: 'rgba(43, 216, 132, 0.32)',
  },
  mrv: {
    color: 'var(--tar-danger)',
    bg: 'rgba(255, 77, 94, 0.12)',
    border: 'rgba(255, 77, 94, 0.32)',
  },
}

export function VolumeLandmarks({
  landmarks,
  labels,
}: {
  landmarks: VolumeLandmark[]
  labels: {
    empty: string
    setsPerWeek: string
    status: Record<VolumeLandmark['status'], string>
  }
}) {
  if (landmarks.length === 0) {
    return (
      <p
        style={{
          font: '500 12px/1.4 var(--tar-mono)',
          letterSpacing: '0.06em',
          color: 'var(--tar-ink-mute)',
        }}
      >
        {labels.empty}
      </p>
    )
  }

  return (
    <div>
      {landmarks.map((l, i) => {
        const config = STATUS_CONFIG[l.status]
        return (
          <div
            key={l.muscle}
            className="flex items-center justify-between"
            style={{
              padding: '10px 0',
              borderTop: i > 0 ? '1px solid var(--tar-line)' : undefined,
            }}
          >
            <span
              className="capitalize"
              style={{
                font: '600 13px/1 var(--tar-text)',
                color: 'var(--tar-ink)',
              }}
            >
              {l.muscle.replace('_', ' ')}
            </span>
            <div className="flex items-center gap-3">
              <span
                className="tabular-nums"
                style={{
                  font: '500 11px/1 var(--tar-mono)',
                  letterSpacing: '0.06em',
                  color: 'var(--tar-ink-mute)',
                }}
              >
                {l.weekly_sets} {labels.setsPerWeek}
              </span>
              <span
                style={{
                  font: '700 9px/1 var(--tar-mono)',
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  padding: '4px 8px',
                  borderRadius: 6,
                  color: config.color,
                  background: config.bg,
                  border: `1px solid ${config.border}`,
                }}
              >
                {labels.status[l.status]}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
