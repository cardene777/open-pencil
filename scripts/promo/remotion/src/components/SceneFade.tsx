import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'

interface Props {
  children: React.ReactNode
  fadeInFrames?: number
  fadeOutFrames?: number
}

export const SceneFade: React.FC<Props> = ({
  children,
  fadeInFrames = 12,
  fadeOutFrames = 12
}) => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()
  const opacity = interpolate(
    frame,
    [0, fadeInFrames, durationInFrames - fadeOutFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>
}
