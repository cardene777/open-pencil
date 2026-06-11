import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'

interface Props {
  title: string
  subtitle?: string
  /** 上端に大きく置くか、 サイドに小さく置くか。 デフォルトはサイド (Linear 風) */
  variant?: 'side' | 'top'
  /** サイドカードに付ける小さなタグ (例: "01 / Workspace") */
  tag?: string
}

/**
 * Caption、 Linear / Granola 風のサイドカード。
 * 左下に番号付きカードを薄く出し、 title を 1 行で見せる。
 */
export const Caption: React.FC<Props> = ({ title, subtitle, variant = 'side', tag }) => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const enter = spring({
    frame: frame - 3,
    fps,
    durationInFrames: 22,
    config: { damping: 26, stiffness: 130, mass: 0.55 }
  })
  const enterY = interpolate(enter, [0, 1], [12, 0])

  const exitStart = durationInFrames - 14
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  if (variant === 'top') {
    return (
      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 76,
            textAlign: 'center',
            fontFamily:
              '"Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif',
            opacity: enter * exit,
            transform: `translateY(${enterY}px)`
          }}
        >
          <div
            style={{
              display: 'inline-block',
              padding: '8px 22px',
              background: 'rgba(13,16,23,0.55)',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12,
              fontSize: 26,
              fontWeight: 600,
              color: '#f5f6f7',
              letterSpacing: '-0.003em'
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                marginTop: 10,
                fontSize: 16,
                fontWeight: 400,
                color: 'rgba(232,234,237,0.7)'
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </AbsoluteFill>
    )
  }

  // Linear 風 左下サイドカード (リッチ化: tag chip + 縦帯 + scale enter)
  const enterScale = interpolate(enter, [0, 1], [0.985, 1])
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      <div
        style={{
          position: 'absolute',
          left: 56,
          bottom: 64,
          maxWidth: 760,
          fontFamily:
            '"Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif',
          opacity: enter * exit,
          transform: `translateY(${enterY}px) scale(${enterScale})`,
          transformOrigin: 'left bottom',
          display: 'flex',
          gap: 18
        }}
      >
        {/* 左の brand 縦帯 */}
        <div
          style={{
            width: 4,
            alignSelf: 'stretch',
            background:
              'linear-gradient(180deg, rgba(124,140,255,0.95) 0%, rgba(124,140,255,0.35) 100%)',
            borderRadius: 4,
            boxShadow: '0 0 18px rgba(124,140,255,0.45)',
            flexShrink: 0
          }}
        />
        <div style={{ flex: 1 }}>
          {tag && (
            <div
              style={{
                display: 'inline-block',
                padding: '5px 12px',
                marginBottom: 16,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.16em',
                textTransform: 'uppercase',
                color: '#dfe2ff',
                background:
                  'linear-gradient(135deg, rgba(124,140,255,0.18) 0%, rgba(124,140,255,0.08) 100%)',
                border: '1px solid rgba(124,140,255,0.45)',
                borderRadius: 999,
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)'
              }}
            >
              {tag}
            </div>
          )}
          <div
            style={{
              fontSize: 48,
              fontWeight: 800,
              color: '#f5f6f7',
              letterSpacing: '-0.022em',
              lineHeight: 1.14,
              textShadow: '0 4px 36px rgba(0,0,0,0.7), 0 2px 8px rgba(0,0,0,0.55)'
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                marginTop: 16,
                fontSize: 22,
                fontWeight: 400,
                color: 'rgba(232,234,237,0.78)',
                letterSpacing: '-0.003em',
                lineHeight: 1.45,
                textShadow: '0 2px 18px rgba(0,0,0,0.6)'
              }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  )
}
