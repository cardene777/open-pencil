import { AbsoluteFill, OffthreadVideo, Sequence, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { staticFile } from 'remotion'
import { Caption } from '../components/Caption'
import { SceneFade } from '../components/SceneFade'
import { Vignette } from '../components/Vignette'

interface CaptionSlot {
  startSec: number
  endSec: number
  title: string
  subtitle?: string
  tag?: string
}

interface Props {
  videoStartSec?: number
  captions: CaptionSlot[]
}

export const SceneFlowContinuous: React.FC<Props> = ({ videoStartSec = 0, captions }) => {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  // 控えめな pan-zoom 1.00 → 1.02
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.02], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  return (
    <SceneFade fadeInFrames={14} fadeOutFrames={14}>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#0d1017' }}>
        <OffthreadVideo
          src={staticFile('clips/flow.webm')}
          startFrom={Math.round(videoStartSec * fps)}
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

      <Vignette strength={0.3} />

      {captions.map((c, i) => {
        const from = Math.round(c.startSec * fps)
        const dur = Math.round((c.endSec - c.startSec) * fps)
        return (
          <Sequence key={i} from={from} durationInFrames={dur}>
            <Caption title={c.title} subtitle={c.subtitle} tag={c.tag} variant="side" />
          </Sequence>
        )
      })}
    </SceneFade>
  )
}
