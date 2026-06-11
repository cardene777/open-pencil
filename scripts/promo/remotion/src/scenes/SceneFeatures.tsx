import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { SceneFade } from '../components/SceneFade'
import { Particles } from '../components/Particles'
import { Vignette } from '../components/Vignette'

interface Feature {
  ext: string
  label: string
  emphasis?: boolean
}

const FEATURES: Feature[] = [
  { ext: '.fig', label: 'Figma 形式', emphasis: true },
  { ext: '.pen', label: 'Pencil ネイティブ', emphasis: true },
  { ext: '.svg', label: 'ベクター書き出し' },
  { ext: '.pdf', label: 'PDF 書き出し' }
]

export const SceneFeatures: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const headerEnter = spring({ frame, fps, durationInFrames: 22, config: { damping: 28, stiffness: 130 } })

  return (
    <SceneFade>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 30%, rgba(124,140,255,0.18) 0%, rgba(13,16,23,0) 60%),' +
            ' linear-gradient(180deg, #0c0f17 0%, #14192a 100%)'
        }}
      />
      <Particles count={12} />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 100px',
          fontFamily:
            '"Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif'
        }}
      >
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 500,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              color: 'rgba(124,140,255,0.92)',
              marginBottom: 22,
              opacity: headerEnter,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace'
            }}
          >
            Native File Support
          </div>
          <div
            style={{
              fontSize: 60,
              fontWeight: 700,
              color: '#f5f6f7',
              letterSpacing: '-0.025em',
              marginBottom: 56,
              opacity: headerEnter
            }}
          >
            変換不要。 そのまま開く。
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 22,
              maxWidth: 1400,
              margin: '0 auto'
            }}
          >
            {FEATURES.map((f, i) => {
              const enter = spring({
                frame: frame - 10 - i * 5,
                fps,
                durationInFrames: 26,
                config: { damping: 24, stiffness: 130 }
              })
              const y = interpolate(enter, [0, 1], [28, 0])

              return (
                <div
                  key={f.ext}
                  style={{
                    padding: '32px 24px',
                    background: f.emphasis
                      ? 'linear-gradient(180deg, rgba(124,140,255,0.12) 0%, rgba(124,140,255,0.04) 100%)'
                      : 'rgba(255,255,255,0.03)',
                    border: f.emphasis
                      ? '1px solid rgba(124,140,255,0.45)'
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 16,
                    opacity: enter,
                    transform: `translateY(${y}px)`,
                    boxShadow: f.emphasis ? '0 0 40px rgba(124,140,255,0.18)' : 'none'
                  }}
                >
                  <div
                    style={{
                      fontSize: 42,
                      fontWeight: 700,
                      color: '#f5f6f7',
                      fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                      letterSpacing: '-0.015em',
                      lineHeight: 1
                    }}
                  >
                    {f.ext}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 16,
                      color: 'rgba(232,234,237,0.62)',
                      letterSpacing: '-0.002em'
                    }}
                  >
                    {f.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>
      <Vignette strength={0.4} />
    </SceneFade>
  )
}
