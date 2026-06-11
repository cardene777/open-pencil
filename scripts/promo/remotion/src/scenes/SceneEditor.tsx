import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { KenBurns } from '../components/KenBurns'
import { Caption } from '../components/Caption'
import { SceneFade } from '../components/SceneFade'

/**
 * SceneEditor — 実エディタ画面 (board/:id) を写す。
 * sparkle 風の小さな光点が canvas 上を移動して操作感を演出。
 */
export const SceneEditor: React.FC = () => {
  const frame = useCurrentFrame()
  const { durationInFrames } = useVideoConfig()

  const t = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const sparkleOpacity = interpolate(
    frame,
    [25, 65, durationInFrames - 30, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  // 左下 → 中央上 への弧
  const sparkleX = 380 + t * 1100
  const sparkleY = 720 - Math.sin(t * Math.PI) * 380

  return (
    <SceneFade>
      <KenBurns src="shots/editor.png" zoom="in" startScale={1.03} endScale={1.14} panX={-25} />

      <AbsoluteFill style={{ pointerEvents: 'none', opacity: sparkleOpacity }}>
        <div
          style={{
            position: 'absolute',
            left: sparkleX,
            top: sparkleY,
            width: 28,
            height: 28,
            borderRadius: '50%',
            background:
              'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(124,140,255,0.85) 35%, rgba(124,140,255,0) 70%)',
            boxShadow:
              '0 0 60px rgba(124,140,255,0.65), 0 0 12px rgba(255,255,255,0.7)',
            transform: 'translate(-50%, -50%)'
          }}
        />
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(13,16,23,0.0) 60%, rgba(13,16,23,0.78) 100%)'
        }}
      />
      <Caption
        title="ブラウザで動く高速エディタ"
        subtitle=".fig も .pen も同じ操作で扱える"
        position="bottom"
      />
    </SceneFade>
  )
}
