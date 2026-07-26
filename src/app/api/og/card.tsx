import { ImageResponse } from 'next/og'
import type { SessionSummary } from '@/lib/services/session-summary.service'

export const CARD_WIDTH = 1200
export const CARD_HEIGHT = 630

/**
 * What a share card needs, and nothing else.
 *
 * The public route serves this from a stored snapshot rather than from live
 * tables, so the shape is what gets written into `workout_shares.snapshot` and
 * has to stay readable by older rows.
 */
export interface CardData {
  dateLabel: string
  totalVolumeKg: number
  totalSets: number
  totalReps: number
  durationMinutes: number | null
  prCount: number
  deltaTonnagePct: number | null
  topExercises: Array<{ id: string; name: string; volume: number }>
}

/** Reduces a full summary to the card payload. */
export function toCardData(summary: SessionSummary, dateLabel: string): CardData {
  return {
    dateLabel,
    totalVolumeKg: summary.totalVolumeKg,
    totalSets: summary.totalSets,
    totalReps: summary.totalReps,
    durationMinutes: summary.durationMinutes,
    prCount: summary.prs.length,
    deltaTonnagePct: summary.comparison?.deltaTonnagePct ?? null,
    topExercises: summary.topExercises.slice(0, 3).map((ex) => ({
      id: ex.exerciseId,
      name: ex.name,
      volume: ex.volume,
    })),
  }
}

export function renderCard(data: CardData): ImageResponse {
  const dt = data.deltaTonnagePct
  const deltaColor =
    dt == null ? '#FFFFFF99' : dt > 0 ? '#22D3A8' : dt < 0 ? '#FF6E76' : '#FFFFFF99'
  const deltaText = dt == null ? '' : `${dt > 0 ? '+' : ''}${dt.toFixed(1)}%`

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(circle at 0% 0%, rgba(255,196,68,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(167,139,250,0.18), transparent 55%), #0A0A0E',
        color: 'white',
        padding: 60,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 22, letterSpacing: 6, fontWeight: 700, color: '#FFC044' }}>
            FORMLY
          </span>
          <span style={{ fontSize: 30, marginTop: 6, opacity: 0.55 }}>{data.dateLabel}</span>
        </div>
        <span style={{ fontSize: 80 }}>🏆</span>
      </div>

      <div style={{ marginTop: 30, display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <span style={{ fontSize: 180, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>
          {data.totalVolumeKg.toLocaleString()}
        </span>
        <span style={{ fontSize: 48, opacity: 0.45 }}>kg</span>
        {deltaText && (
          <span style={{ fontSize: 38, color: deltaColor, fontWeight: 700, marginLeft: 14 }}>
            {deltaText}
          </span>
        )}
      </div>
      <div
        style={{
          fontSize: 26,
          opacity: 0.45,
          marginTop: 6,
          letterSpacing: 4,
          textTransform: 'uppercase',
        }}
      >
        Tonnage moved
      </div>

      <div style={{ display: 'flex', gap: 24, marginTop: 50 }}>
        <Stat label="Sets" value={`${data.totalSets}`} />
        <Stat label="Reps" value={`${data.totalReps}`} />
        <Stat
          label="Duration"
          value={data.durationMinutes != null ? `${data.durationMinutes}m` : '—'}
        />
        <Stat label="New PRs" value={`${data.prCount}`} highlight={data.prCount > 0} />
      </div>

      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {data.topExercises.map((ex) => (
          <div
            key={ex.id}
            style={{ display: 'flex', justifyContent: 'space-between', fontSize: 26 }}
          >
            <span style={{ opacity: 0.9 }}>{ex.name || '·'}</span>
            <span style={{ color: '#FFC044', fontWeight: 700 }}>
              {ex.volume.toLocaleString()} kg
            </span>
          </div>
        ))}
      </div>
    </div>,
    { width: CARD_WIDTH, height: CARD_HEIGHT },
  )
}

interface StatProps {
  label: string
  value: string
  highlight?: boolean
}

function Stat({ label, value, highlight }: StatProps) {
  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '22px 26px',
        borderRadius: 18,
        background: highlight ? 'rgba(255,196,68,0.12)' : 'rgba(255,255,255,0.04)',
        border: highlight ? '1px solid rgba(255,196,68,0.32)' : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span style={{ fontSize: 18, letterSpacing: 3, opacity: 0.45, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span
        style={{
          fontSize: 56,
          fontWeight: 900,
          marginTop: 6,
          color: highlight ? '#FFC044' : 'white',
        }}
      >
        {value}
      </span>
    </div>
  )
}
