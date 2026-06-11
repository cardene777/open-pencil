import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion'

interface Props {
  count?: number
}

/**
 * Particles — 背景にゆらゆら浮かぶ orb 粒子 (Linear / Granola の hero 背景でよく見る)。
 */
export const Particles: React.FC<Props> = ({ count = 18 }) => {
  const frame = useCurrentFrame()
  const { fps, width, height } = useVideoConfig()

  return (
    <AbsoluteFill style={{ pointerEvents: 'none', overflow: 'hidden' }}>
      {Array.from({ length: count }).map((_, i) => {
        // 決定的なシード (同じ frame で同じ位置)
        const seedX = (i * 137.5) % 1
        const seedY = (i * 89.3) % 1
        const seedR = ((i * 53.7) % 1) * 220 + 60
        const seedSpeed = 0.06 + ((i * 0.1) % 0.1)
        const seedHue = (i * 41) % 360

        const t = frame / fps
        const x = (seedX * width + Math.sin(t * seedSpeed + i) * 60) % width
        const y = (seedY * height + Math.cos(t * seedSpeed * 1.2 + i) * 40) % height

        const isPurple = i % 2 === 0
        const color = isPurple ? '124,140,255' : '176,140,255'

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x - seedR / 2,
              top: y - seedR / 2,
              width: seedR,
              height: seedR,
              borderRadius: '50%',
              background: `radial-gradient(circle, rgba(${color},0.12) 0%, rgba(${color},0) 60%)`,
              filter: 'blur(20px)',
              opacity: 0.7,
              willChange: 'transform'
            }}
          />
        )
      })}
    </AbsoluteFill>
  )
}
