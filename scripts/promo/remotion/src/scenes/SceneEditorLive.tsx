import { AbsoluteFill, OffthreadVideo, interpolate, useCurrentFrame, useVideoConfig } from 'remotion'
import { staticFile } from 'remotion'
import { Caption } from '../components/Caption'
import { SceneFade } from '../components/SceneFade'

/**
 * SceneEditorLive — Playwright で録画したエディタ操作 webm を再生する。
 * 重要 frame で zoom-in + ハイライトリングを乗せて「ここに注目」を出す。
 */
export const SceneEditorLive: React.FC = () => {
  const frame = useCurrentFrame()
  const { durationInFrames, fps } = useVideoConfig()

  // 操作の前半 (.pen ロード) は全景、 後半 (描画/移動) で zoom-in
  const t = frame / durationInFrames
  const scale = interpolate(t, [0, 0.5, 0.85, 1.0], [1.0, 1.04, 1.08, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  // ハイライトリングの opacity (中盤で出して終盤で消える)
  const ringOpacity = interpolate(
    frame,
    [fps * 2, fps * 2.5, fps * 5.5, fps * 6],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )
  const ringX = interpolate(frame, [fps * 2, fps * 6], [880, 1080], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  return (
    <SceneFade>
      <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#0d1017' }}>
        <OffthreadVideo
          src={staticFile('clips/editor-demo.webm')}
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

      {/* ハイライトリング — クリック位置を強調 */}
      <AbsoluteFill style={{ pointerEvents: 'none', opacity: ringOpacity }}>
        <div
          style={{
            position: 'absolute',
            left: ringX,
            top: 460,
            width: 180,
            height: 180,
            borderRadius: '50%',
            border: '3px solid rgba(124,140,255,0.85)',
            boxShadow:
              '0 0 0 8px rgba(124,140,255,0.18), 0 0 60px rgba(124,140,255,0.35), inset 0 0 30px rgba(124,140,255,0.12)',
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
        title="ファイルを開くだけで、 すぐ編集"
        subtitle=".pen を開いて、 オブジェクトを動かす"
        position="bottom"
      />
    </SceneFade>
  )
}
