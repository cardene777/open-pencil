import { AbsoluteFill, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { staticFile } from 'remotion'
import { Caption } from '../components/Caption'
import { SceneFade } from '../components/SceneFade'

interface Props {
  startFromSec: number
  title: string
  subtitle?: string
}

export const SceneFlow: React.FC<Props> = ({ startFromSec, title, subtitle }) => {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  // Subtle pan: 1.00 → 1.025
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.025], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  return (
    <SceneFade>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#0d1017' }}>
        <OffthreadVideo
          src={staticFile('clips/flow.webm')}
          startFrom={Math.round(startFromSec * fps)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: `scale(${scale})`,
            transformOrigin: 'center center'
          }}
          muted
        />
      </AbsoluteFill>
      <Caption title={title} subtitle={subtitle} position="top" />
    </SceneFade>
  )
}
