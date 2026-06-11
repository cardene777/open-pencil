import { AbsoluteFill, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { staticFile } from 'remotion'
import { Caption } from '../components/Caption'
import { SceneFade } from '../components/SceneFade'
import { Vignette } from '../components/Vignette'

export const SceneCollab: React.FC = () => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  return (
    <SceneFade fadeInFrames={14} fadeOutFrames={14}>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#0d1017' }}>
        <OffthreadVideo
          src={staticFile('clips/collab.webm')}
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

      <Vignette strength={0.32} />

      <Caption
        tag="10 / Collaborate"
        title="リアルタイムで、 共同編集"
        subtitle="招待 URL を踏んだチームが、 同じデザインを同時に動かす"
        variant="side"
      />
    </SceneFade>
  )
}
