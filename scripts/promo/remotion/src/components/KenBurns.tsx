import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { staticFile } from 'remotion'

interface Props {
  src: string
  zoom?: 'in' | 'out'
  panX?: number // px、 終端での横移動 (-100 ~ 100)
  panY?: number // px、 終端での縦移動 (-100 ~ 100)
  startScale?: number
  endScale?: number
}

/**
 * KenBurns — 画像 1 枚を緩やかに zoom + pan する。 spring を frame ごとに評価。
 */
export const KenBurns: React.FC<Props> = ({
  src,
  zoom = 'in',
  panX = 0,
  panY = 0,
  startScale,
  endScale
}) => {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  // spring で滑らかな easeInOut
  const eased = spring({
    frame,
    fps,
    durationInFrames,
    config: { mass: 1, damping: 200, stiffness: 60 }
  })

  const s0 = startScale ?? (zoom === 'in' ? 1.0 : 1.12)
  const s1 = endScale ?? (zoom === 'in' ? 1.12 : 1.0)
  const scale = s0 + (s1 - s0) * eased

  const tx = panX * t
  const ty = panY * t

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#0d1017' }}>
      <Img
        src={staticFile(src)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          transformOrigin: 'center center',
          willChange: 'transform'
        }}
      />
    </AbsoluteFill>
  )
}
