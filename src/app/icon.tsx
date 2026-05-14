import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
          borderRadius: 96,
        }}
      >
        <svg width="320" height="320" viewBox="0 0 24 24" fill="none">
          {/* Dumbbell bar */}
          <rect x="2" y="11" width="20" height="2" rx="1" fill="white" />
          {/* Left weight */}
          <rect x="2" y="8" width="3" height="8" rx="1" fill="white" />
          <rect x="0" y="9" width="2" height="6" rx="1" fill="white" />
          {/* Right weight */}
          <rect x="19" y="8" width="3" height="8" rx="1" fill="white" />
          <rect x="22" y="9" width="2" height="6" rx="1" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
