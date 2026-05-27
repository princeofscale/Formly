interface Props {
  /** ISO date strings (YYYY-MM-DD) for finished workouts */
  workoutDates: string[]
  /** Scheduled training days as ISO-day numbers (1=Mon, 7=Sun) */
  schedule?: number[]
  labels: {
    days: {
      '1': string
      '2': string
      '3': string
      '4': string
      '5': string
      '6': string
      '7': string
    }
  }
}

const CheckIcon = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m5 12 5 5L20 7" />
  </svg>
)

export function WeekdayStrip({ workoutDates, schedule = [], labels }: Props) {
  const done = new Set(workoutDates)
  const scheduled = new Set(schedule)

  const today = new Date()
  const days: Array<{
    iso: string
    isoDay: number
    done: boolean
    scheduled: boolean
    today: boolean
  }> = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const jsDay = d.getDay()
    const isoDay = jsDay === 0 ? 7 : jsDay
    days.push({
      iso,
      isoDay,
      done: done.has(iso),
      scheduled: scheduled.has(isoDay),
      today: i === 0,
    })
  }

  return (
    <div className="tar-d-weekstrip">
      {days.map((d) => {
        const dayKey = String(d.isoDay) as '1' | '2' | '3' | '4' | '5' | '6' | '7'
        const cls =
          'day' +
          (d.done ? ' done' : '') +
          (d.today ? ' today' : '') +
          (!d.done && d.scheduled ? ' scheduled' : '')
        return (
          <div key={d.iso} className={cls}>
            <span className="lab">{labels.days[dayKey].slice(0, 3)}</span>
            <div className="cell">
              {d.done ? (
                CheckIcon
              ) : d.today ? (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--tar-brand-2)',
                    boxShadow: '0 0 8px var(--tar-brand-2)',
                  }}
                />
              ) : null}
            </div>
          </div>
        )
      })}
    </div>
  )
}
