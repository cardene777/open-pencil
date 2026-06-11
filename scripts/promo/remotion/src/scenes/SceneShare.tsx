import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { KenBurns } from '../components/KenBurns'
import { Caption } from '../components/Caption'
import { SceneFade } from '../components/SceneFade'

export const SceneShare: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // モーダル風の URL ピル + コピーボタンが pop-in
  const modalEnter = spring({
    frame: frame - 15,
    fps,
    durationInFrames: 28,
    config: { damping: 18, stiffness: 100, mass: 0.6 }
  })
  const modalScale = interpolate(modalEnter, [0, 1], [0.85, 1])
  const modalOpacity = interpolate(
    frame,
    [15, 35, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // コピーボタンの「コピー → コピー済」アニメ
  const copiedFlash = interpolate(frame, [120, 130, 160, 170], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  return (
    <SceneFade>
      <KenBurns src="shots/share-modal.png" zoom="in" startScale={1.02} endScale={1.1} />

      {/* 暗いオーバーレイ */}
      <AbsoluteFill style={{ background: 'rgba(13,16,23,0.55)' }} />

      {/* 中央の URL モーダル */}
      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          opacity: modalOpacity,
          transform: `scale(${modalScale})`,
          pointerEvents: 'none'
        }}
      >
        <div
          style={{
            width: 1100,
            padding: 32,
            background: 'rgba(20,24,34,0.92)',
            border: '1px solid rgba(124,140,255,0.35)',
            borderRadius: 20,
            backdropFilter: 'blur(20px)',
            boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
            fontFamily:
              '"Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif'
          }}
        >
          <div
            style={{
              fontSize: 16,
              textTransform: 'uppercase',
              letterSpacing: '0.18em',
              color: 'rgba(124,140,255,0.9)',
              fontWeight: 600
            }}
          >
            Invitation URL
          </div>
          <div
            style={{
              marginTop: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div
              style={{
                flex: 1,
                padding: '20px 24px',
                background: 'rgba(0,0,0,0.4)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 12,
                fontSize: 28,
                color: '#e8eaed',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              https://pencil-editor.fly.dev/invite/abc123…
            </div>
            <button
              type="button"
              style={{
                position: 'relative',
                padding: '20px 36px',
                background: 'linear-gradient(135deg, #7c8cff 0%, #b08cff 100%)',
                border: 'none',
                borderRadius: 12,
                fontSize: 24,
                fontWeight: 700,
                color: '#0d1017',
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              <span style={{ opacity: 1 - copiedFlash }}>コピー</span>
              <span
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: copiedFlash,
                  background: 'linear-gradient(135deg, #7c8cff 0%, #b08cff 100%)',
                  borderRadius: 12,
                  color: '#0d1017',
                  fontWeight: 700,
                  fontSize: 24
                }}
              >
                ✓ コピー済
              </span>
            </button>
          </div>
          <div
            style={{
              marginTop: 14,
              fontSize: 18,
              color: 'rgba(232,234,237,0.55)'
            }}
          >
            リンクの有効期限は 7 日間。 招待相手にリンクを送るだけでコラボ開始。
          </div>
        </div>
      </AbsoluteFill>

      <Caption
        title="1 click で招待 URL を共有"
        subtitle="Slack でも LINE でもメールでも、 どこへでも"
        position="bottom"
      />
    </SceneFade>
  )
}
