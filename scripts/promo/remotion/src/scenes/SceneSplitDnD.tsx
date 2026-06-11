import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { SceneFade } from '../components/SceneFade'
import { Particles } from '../components/Particles'
import { Vignette } from '../components/Vignette'
import { Caption } from '../components/Caption'

/**
 * SceneSplitDnD は誤解を招く名前のままですが、 中身は順次 DnD の Remotion 抽象演出。
 * 流れ:
 *   0.0-2.2s, .fig カードが右下から中央プレビューへ滑り込み
 *   2.2-2.5s, ドロップ瞬間、 canvas 全体が brand purple で 0.3 秒光る
 *   2.5-5.0s, .pen カードが右下から中央プレビューへ滑り込み
 *   5.0-5.3s, ドロップ瞬間、 canvas 全体が brand purple で 0.3 秒光る
 *   5.3-6.0s, 残光と静止
 */
interface FileCardProps {
  ext: '.fig' | '.pen'
  name: string
  size: string
  travel: number
  appear: number
  startX: number
  startY: number
  endX: number
  endY: number
}

const FileCard: React.FC<FileCardProps> = ({
  ext,
  name,
  size,
  travel,
  appear,
  startX,
  startY,
  endX,
  endY
}) => {
  const x = startX + (endX - startX) * travel
  const y = startY + (endY - startY) * travel
  const opacity = appear * Math.max(0, 1 - travel * 1.05)
  const scale = appear * (1 - travel * 0.18)

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity,
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 26px 16px 18px',
        background: 'linear-gradient(135deg, rgba(20,24,34,0.95) 0%, rgba(28,32,46,0.95) 100%)',
        border: '1px solid rgba(124,140,255,0.5)',
        borderRadius: 16,
        boxShadow:
          '0 24px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), 0 0 80px rgba(124,140,255,0.4)',
        backdropFilter: 'blur(20px)',
        fontFamily:
          '"Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif',
        color: '#f5f6f7'
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background:
            ext === '.pen'
              ? 'linear-gradient(135deg, #7c8cff 0%, #b08cff 100%)'
              : 'linear-gradient(135deg, #ff7c8c 0%, #ffb08c 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0d1017',
          fontFamily: 'ui-monospace, SFMono-Regular, monospace',
          fontWeight: 700,
          fontSize: 14
        }}
      >
        {ext}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{name}</div>
        <div style={{ fontSize: 13, color: 'rgba(232,234,237,0.6)' }}>{size}</div>
      </div>
    </div>
  )
}

export const SceneSplitDnD: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const t = frame / fps

  // canvas プレビュー (中央受け皿)
  const previewEnter = spring({
    frame,
    fps,
    durationInFrames: 26,
    config: { damping: 26, stiffness: 120 }
  })
  const previewScale = interpolate(previewEnter, [0, 1], [0.94, 1])

  // 中央 box の座標、 1920x1080 内
  const previewW = 1280
  const previewH = 680
  const previewLeft = (1920 - previewW) / 2
  const previewTop = (1080 - previewH) / 2

  // 1) .fig カードの動き
  const figAppear = spring({
    frame: frame - 6,
    fps,
    durationInFrames: 18,
    config: { damping: 22, stiffness: 130 }
  })
  const figStart = { x: 1740, y: 940 }
  const figEnd = { x: 1920 / 2, y: 1080 / 2 }
  const figTravelStart = 0.35
  const figTravelEnd = 2.05
  const figTravel = interpolate(t, [figTravelStart, figTravelEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  // .fig ドロップ閃光
  const figFlashStart = figTravelEnd
  const figFlashDur = 0.45
  const figFlash = interpolate(
    t,
    [figFlashStart, figFlashStart + 0.08, figFlashStart + figFlashDur],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // 2) .pen カードの動き、 .fig ドロップ後にスタート
  const penAppear = spring({
    frame: frame - Math.round(fps * 2.7),
    fps,
    durationInFrames: 18,
    config: { damping: 22, stiffness: 130 }
  })
  const penTravelStart = 3.1
  const penTravelEnd = 4.85
  const penTravel = interpolate(t, [penTravelStart, penTravelEnd], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  const penFlashStart = penTravelEnd
  const penFlashDur = 0.45
  const penFlash = interpolate(
    t,
    [penFlashStart, penFlashStart + 0.08, penFlashStart + penFlashDur],
    [0, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  )

  // 全体閃光、 max(figFlash, penFlash)
  const flash = Math.max(figFlash, penFlash)

  return (
    <SceneFade fadeInFrames={14} fadeOutFrames={14}>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(124,140,255,0.16) 0%, rgba(13,16,23,0) 60%),' +
            ' linear-gradient(180deg, #0c0f17 0%, #14192a 100%)'
        }}
      />
      <Particles count={12} />

      {/* 中央 canvas プレビュー */}
      <div
        style={{
          position: 'absolute',
          left: previewLeft,
          top: previewTop,
          width: previewW,
          height: previewH,
          borderRadius: 22,
          background: 'rgba(20,24,34,0.85)',
          border: `2px dashed rgba(124,140,255,${0.45 + flash * 0.5})`,
          opacity: previewEnter,
          transform: `scale(${previewScale})`,
          transformOrigin: 'center center',
          boxShadow: `0 30px 80px rgba(0,0,0,0.45), inset 0 0 ${60 + flash * 200}px rgba(124,140,255,${0.04 + flash * 0.55})`,
          backdropFilter: 'blur(20px)',
          overflow: 'hidden'
        }}
      >
        {/* canvas タイトル */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: '"Inter", "Hiragino Sans", -apple-system, sans-serif',
            fontSize: 22,
            color: 'rgba(232,234,237,0.55)',
            fontWeight: 500,
            letterSpacing: '-0.002em'
          }}
        >
          Pencil Editor canvas
        </div>

        {/* 全面の閃光オーバーレイ */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(ellipse at center, rgba(124,140,255,0.9) 0%, rgba(124,140,255,0) 70%)',
            opacity: flash
          }}
        />
      </div>

      {/* .fig カード */}
      <FileCard
        ext=".fig"
        name="replay-marketing.fig"
        size="68 KB · Figma 形式"
        travel={figTravel}
        appear={figAppear}
        startX={figStart.x}
        startY={figStart.y}
        endX={figEnd.x}
        endY={figEnd.y}
      />

      {/* .pen カード */}
      <FileCard
        ext=".pen"
        name="landing-fintech.pen"
        size="103 KB · Pencil ネイティブ"
        travel={penTravel}
        appear={penAppear}
        startX={figStart.x}
        startY={figStart.y}
        endX={figEnd.x}
        endY={figEnd.y}
      />

      <Caption
        tag="02 / Upload"
        title=".fig も .pen も同じエディタで"
        subtitle="2 つの形式を順番にドラッグ&ドロップ"
        variant="side"
      />

      <Vignette strength={0.38} />
    </SceneFade>
  )
}
