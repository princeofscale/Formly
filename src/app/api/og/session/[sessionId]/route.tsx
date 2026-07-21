import { ImageResponse } from 'next/og'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import { getSessionSummary } from '@/lib/services/session-summary.service'

export const runtime = 'nodejs'

const W = 1200
const H = 630

export async function GET(_req: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params

  let summary
  let dateLabel = ''
  try {
    const { user } = await verifySession()
    const supabase = await createClient()

    const { data: session } = await supabase
      .from('workout_sessions')
      .select('id, started_at, user_id')
      .eq('id', sessionId)
      .single()

    if (!session || session.user_id !== user.id) {
      return new Response('Not found', { status: 404 })
    }

    summary = await getSessionSummary(supabase, user.id, sessionId)
    dateLabel = new Date(session.started_at as string).toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  if (!summary) {
    return new Response('No data', { status: 404 })
  }

  const dt = summary.comparison?.deltaTonnagePct ?? null
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: 22, letterSpacing: 6, fontWeight: 700, color: '#FFC044' }}>
            FORMLY
          </span>
          <span style={{ fontSize: 30, marginTop: 6, opacity: 0.55 }}>{dateLabel}</span>
        </div>
        <span style={{ fontSize: 80 }}>🏆</span>
      </div>

      {/* Tonnage hero */}
      <div style={{ marginTop: 30, display: 'flex', alignItems: 'baseline', gap: 18 }}>
        <span style={{ fontSize: 180, fontWeight: 900, lineHeight: 1, letterSpacing: -3 }}>
          {summary.totalVolumeKg.toLocaleString()}
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

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 24, marginTop: 50 }}>
        <Stat label="Sets" value={`${summary.totalSets}`} />
        <Stat label="Reps" value={`${summary.totalReps}`} />
        <Stat
          label="Duration"
          value={summary.durationMinutes != null ? `${summary.durationMinutes}m` : '—'}
        />
        <Stat label="New PRs" value={`${summary.prs.length}`} highlight={summary.prs.length > 0} />
      </div>

      {/* Top exercises */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {summary.topExercises.slice(0, 3).map((ex) => (
          <div
            key={ex.exerciseId}
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
    { width: W, height: H },
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
