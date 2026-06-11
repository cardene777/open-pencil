import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { SceneFade } from '../components/SceneFade'
import { Particles } from '../components/Particles'
import { Vignette } from '../components/Vignette'

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const titleEnter = spring({
    frame,
    fps,
    durationInFrames: 32,
    config: { damping: 18, stiffness: 100 }
  })
  const urlEnter = spring({
    frame: frame - 24,
    fps,
    durationInFrames: 28,
    config: { damping: 22, stiffness: 110 }
  })

  const titleY = interpolate(titleEnter, [0, 1], [20, 0])

  // 静止 + 微かな glow breath、 pulse は控えめ
  const breath = 1 + 0.012 * Math.sin((frame / fps) * 1.3)

  return (
    <SceneFade fadeOutFrames={26}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(124,140,255,0.32) 0%, rgba(13,16,23,0) 60%),' +
            ' linear-gradient(180deg, #0c0f17 0%, #14192a 100%)'
        }}
      />
      <Particles count={22} />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily:
            '"Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center', opacity: titleEnter, transform: `translateY(${titleY}px)` }}>
          <div
            style={{
              fontSize: 144,
              fontWeight: 800,
              letterSpacing: '-0.035em',
              lineHeight: 0.98,
              background: 'linear-gradient(135deg, #ffffff 0%, #c8d4ff 55%, #c4a0ff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 80px rgba(124,140,255,0.35)'
            }}
          >
            Pencil Editor
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 28,
              color: 'rgba(232,234,237,0.7)',
              fontWeight: 400,
              letterSpacing: '-0.003em'
            }}
          >
            今すぐブラウザで試せる
          </div>
          <div
            style={{
              marginTop: 56,
              opacity: urlEnter,
              transform: `translateY(${interpolate(urlEnter, [0, 1], [16, 0])}px) scale(${breath})`
            }}
          >
            <div
              style={{
                display: 'inline-block',
                padding: '18px 46px',
                background: 'rgba(124,140,255,0.08)',
                border: '1px solid rgba(124,140,255,0.4)',
                borderRadius: 999,
                fontSize: 30,
                fontWeight: 500,
                color: '#f5f6f7',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                letterSpacing: '0.005em',
                boxShadow: '0 0 64px rgba(124,140,255,0.32), inset 0 0 24px rgba(124,140,255,0.08)'
              }}
            >
              pencil-editor.fly.dev
            </div>
          </div>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.5} />
    </SceneFade>
  )
}
