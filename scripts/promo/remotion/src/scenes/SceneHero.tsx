import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { SceneFade } from '../components/SceneFade'
import { Particles } from '../components/Particles'
import { Vignette } from '../components/Vignette'

export const SceneHero: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const tagEnter = spring({ frame, fps, durationInFrames: 22, config: { damping: 28, stiffness: 130 } })
  const titleEnter = spring({
    frame: frame - 6,
    fps,
    durationInFrames: 30,
    config: { damping: 22, stiffness: 110 }
  })
  const subEnter = spring({
    frame: frame - 18,
    fps,
    durationInFrames: 28,
    config: { damping: 24, stiffness: 120 }
  })

  const titleY = interpolate(titleEnter, [0, 1], [22, 0])
  const subY = interpolate(subEnter, [0, 1], [16, 0])

  return (
    <SceneFade>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 25% 20%, rgba(124,140,255,0.28) 0%, rgba(13,16,23,0) 55%),' +
            ' radial-gradient(ellipse at 80% 80%, rgba(176,140,255,0.18) 0%, rgba(13,16,23,0) 55%),' +
            ' linear-gradient(180deg, #0c0f17 0%, #14192a 100%)'
        }}
      />
      <Particles count={18} />

      <AbsoluteFill
        style={{
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '0 120px',
          fontFamily:
            '"Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif'
        }}
      >
        <div style={{ maxWidth: 1500 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              letterSpacing: '0.32em',
              textTransform: 'uppercase',
              color: 'rgba(124,140,255,0.95)',
              marginBottom: 36,
              opacity: tagEnter,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace'
            }}
          >
            Pencil Editor
          </div>
          <div
            style={{
              fontSize: 112,
              fontWeight: 700,
              color: '#f5f6f7',
              letterSpacing: '-0.035em',
              lineHeight: 1.02,
              opacity: titleEnter,
              transform: `translateY(${titleY}px)`
            }}
          >
            <span
              style={{
                background: 'linear-gradient(135deg, #b6c4ff 0%, #b08cff 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              LLM
            </span>
            <span style={{ color: '#f5f6f7' }}> で作って、 </span>
            <br />
            <span style={{ color: '#f5f6f7' }}>チームで </span>
            <span
              style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #b6c4ff 55%, #b08cff 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent'
              }}
            >
              磨く。
            </span>
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 28,
              fontWeight: 400,
              color: 'rgba(232,234,237,0.7)',
              letterSpacing: '-0.002em',
              maxWidth: 900,
              lineHeight: 1.45,
              opacity: subEnter,
              transform: `translateY(${subY}px)`
            }}
          >
            Claude Code から仕様書と .pen を生成、
            <br />
            ブラウザでチームと同時に編集する。
          </div>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.4} />
    </SceneFade>
  )
}
