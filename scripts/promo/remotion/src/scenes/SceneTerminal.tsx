import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { SceneFade } from '../components/SceneFade'
import { Particles } from '../components/Particles'
import { Vignette } from '../components/Vignette'
import { Caption } from '../components/Caption'

interface TerminalLine {
  /** 表示開始秒 */
  startSec: number
  /** typewriter 風に打つ場合の文字、 出力行は instant=true で一度に表示 */
  text: string
  /** プロンプト表示するか (`$ `) */
  isInput?: boolean
  /** 行のカラー (出力時の色) */
  color?: string
}

const LINES: TerminalLine[] = [
  { startSec: 0.3, text: '/pencil-spec Replay marketing と Fintech LP', isInput: true },
  { startSec: 1.6, text: '→ design/specs/ に仕様書を 2 本生成', color: 'rgba(124,140,255,0.85)' },
  { startSec: 2.6, text: '/pencil-design design/specs/*.md', isInput: true },
  { startSec: 4.1, text: '→ inkly eval で .fig と .pen にフレームを配置', color: 'rgba(124,140,255,0.85)' },
  { startSec: 4.9, text: '✓ replay-marketing.fig    16 frames', color: 'rgba(124,255,180,0.9)' },
  { startSec: 5.4, text: '✓ landing-fintech.pen     11 frames', color: 'rgba(124,255,180,0.9)' },
  { startSec: 5.9, text: '→ Figma 形式も Pencil 形式も同時に出力', color: 'rgba(232,234,237,0.75)' },
  { startSec: 6.6, text: 'ls design/*.{fig,pen}', isInput: true },
  { startSec: 7.5, text: 'replay-marketing.fig   landing-fintech.pen', color: 'rgba(232,234,237,0.92)' }
]

function partialText(line: TerminalLine, currentSec: number, fps: number, frame: number): string {
  if (!line.isInput) return line.text
  // typewriter、 1 文字 ≒ 0.04 秒
  const elapsedSec = currentSec - line.startSec
  if (elapsedSec <= 0) return ''
  const charPerSec = 25
  const chars = Math.floor(elapsedSec * charPerSec)
  return line.text.substring(0, chars)
}

export const SceneTerminal: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const currentSec = frame / fps

  const enter = spring({ frame, fps, durationInFrames: 26, config: { damping: 26, stiffness: 130 } })
  const y = interpolate(enter, [0, 1], [40, 0])

  // カーソルの blink
  const blink = Math.floor((frame / fps) * 2.2) % 2 === 0

  return (
    <SceneFade>
      <AbsoluteFill
        style={{
          background:
            'radial-gradient(ellipse at 70% 30%, rgba(124,140,255,0.16) 0%, rgba(13,16,23,0) 60%),' +
            ' linear-gradient(180deg, #0c0f17 0%, #14192a 100%)'
        }}
      />
      <Particles count={10} />

      <AbsoluteFill
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          padding: '0 100px',
          fontFamily:
            '"Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif'
        }}
      >
        <div
          style={{
            width: 1400,
            maxWidth: '90%',
            background: 'rgba(20,24,34,0.88)',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 16,
            boxShadow: '0 30px 80px rgba(0,0,0,0.5), 0 0 60px rgba(124,140,255,0.18)',
            backdropFilter: 'blur(20px)',
            overflow: 'hidden',
            opacity: enter,
            transform: `translateY(${y}px)`
          }}
        >
          {/* terminal title bar */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(0,0,0,0.18)'
            }}
          >
            <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#ff5f57' }} />
            <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#febc2e' }} />
            <div style={{ width: 13, height: 13, borderRadius: '50%', background: '#28c840' }} />
            <div
              style={{
                marginLeft: 16,
                fontSize: 13,
                color: 'rgba(232,234,237,0.55)',
                fontFamily: 'ui-monospace, SFMono-Regular, monospace'
              }}
            >
              claude code · ~/projects/pencil-editor
            </div>
          </div>

          {/* terminal body */}
          <div
            style={{
              padding: '28px 32px 36px',
              minHeight: 460,
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              fontSize: 22,
              lineHeight: 1.55,
              color: 'rgba(232,234,237,0.92)'
            }}
          >
            {LINES.map((line, i) => {
              if (currentSec < line.startSec) return null
              const text = partialText(line, currentSec, fps, frame)
              const done = line.isInput ? text.length === line.text.length : true
              const showCursor = i === LINES.length - 1 || (line.isInput && !done)
              return (
                <div key={i} style={{ color: line.color ?? 'rgba(232,234,237,0.92)' }}>
                  {line.isInput && <span style={{ color: 'rgba(124,140,255,0.85)' }}>$ </span>}
                  {text}
                  {showCursor && (
                    <span
                      style={{
                        display: 'inline-block',
                        marginLeft: 4,
                        width: 10,
                        height: 22,
                        background: 'rgba(232,234,237,0.85)',
                        verticalAlign: 'middle',
                        opacity: blink ? 1 : 0
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </AbsoluteFill>

      <Caption
        tag="AI / Generate"
        title="Claude Code から、 デザインを生成"
        subtitle="pencil-spec で仕様書、 pencil-design で .pen を出力"
        variant="side"
      />

      <Vignette strength={0.42} />
    </SceneFade>
  )
}
