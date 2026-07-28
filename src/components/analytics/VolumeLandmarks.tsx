import type { VolumeLandmark } from '@/lib/types/models'

/** Indirect work counts half a set, so totals arrive with a .5 on them. */
function round(sets: number): string {
  return Number.isInteger(sets) ? String(sets) : sets.toFixed(1)
}

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
    /** Localized muscle names keyed by the raw muscle id (quads, triceps, …). */
    muscles: Record<string, string>
    /** Stands in for a region row that carries the group's own id — see below. */
    regionUnspecified: string
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
            style={{
              padding: '10px 0',
              borderTop: i > 0 ? '1px solid var(--tar-line)' : undefined,
            }}
          >
            <div className="flex items-center justify-between">
              <span
                style={{
                  font: '600 13px/1 var(--tar-text)',
                  color: 'var(--tar-ink)',
                }}
              >
                {labels.muscles[l.muscle] ?? l.muscle.replace('_', ' ')}
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
                  {round(l.weekly_sets)} {labels.setsPerWeek}
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

            {/* Which angles the week's sets actually came from. The verdict
                above is the group's; these are the parts of it.

                A region row carrying the group's own id is not a region: it is
                the work that never said which one — a secondary contribution,
                or an exercise the athlete tagged "chest" and left at that. It
                says so rather than borrowing the name of a region it may not
                have trained. */}
            {l.regions && l.regions.length > 0 && (
              <div className="mt-2 flex flex-col gap-1 pl-3">
                {l.regions.map((r) => (
                  <div key={r.muscle} className="flex items-center justify-between">
                    <span
                      style={{
                        font: '500 11px/1 var(--tar-text)',
                        color: 'var(--tar-ink-mute)',
                      }}
                    >
                      {r.muscle === l.muscle
                        ? labels.regionUnspecified
                        : (labels.muscles[r.muscle] ?? r.muscle.replace('_', ' '))}
                    </span>
                    <span
                      className="tabular-nums"
                      style={{
                        font: '500 11px/1 var(--tar-mono)',
                        letterSpacing: '0.06em',
                        color: 'var(--tar-ink-mute)',
                      }}
                    >
                      {round(r.weekly_sets)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
