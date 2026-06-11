import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'

interface Props {
  /** flash の中心 frame */
  atFrame: number
  /** flash 全体の長さ (frame) */
  durationFrames?: number
  /** 最大 opacity */
  peakOpacity?: number
}

/**
 * FlashTransition — マーケ動画でよくある「白フラッシュでシーン切替を強調」演出。
 * Linear / Granola / Stripe の hero でよく見るやつ。
 */
export const FlashTransition: React.FC<Props> = ({
  atFrame,
  durationFrames = 12,
  peakOpacity = 0.32
}) => {
  const frame = useCurrentFrame()
  const half = durationFrames / 2
  const opacity = interpolate(
    frame,
    [atFrame - half, atFrame, atFrame + half],
    [0, peakOpacity, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  if (opacity <= 0) return null
  return (
    <AbsoluteFill
      style={{
        background: 'white',
        opacity,
        pointerEvents: 'none'
      }}
    />
  )
}
