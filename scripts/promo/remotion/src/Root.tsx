import { Composition } from 'remotion'
import { PencilEditorPromo } from './PencilEditorPromo'

const FPS = 60
const TOTAL_SECONDS = 51

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="PencilEditorPromo"
        component={PencilEditorPromo}
        durationInFrames={TOTAL_SECONDS * FPS}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  )
}
