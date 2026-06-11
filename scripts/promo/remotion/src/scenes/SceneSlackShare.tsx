import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { Caption } from '../components/Caption'
import { SceneFade } from '../components/SceneFade'
import { Vignette } from '../components/Vignette'

const BRAND_PURPLE = '#7c8cff'

// Slack 風の配色
const SLACK_SIDEBAR_BG = '#19171d'
const SLACK_WORKSPACE_BG = '#350d36'
const SLACK_MAIN_BG = '#1a1d21'
const SLACK_BORDER = 'rgba(255,255,255,0.08)'
const SLACK_TEXT = '#d1d2d3'
const SLACK_TEXT_MUTED = 'rgba(209,210,211,0.55)'
const SLACK_LINK = '#1d9bd1'

interface ChannelRow {
  name: string
  active?: boolean
  unread?: boolean
}

const CHANNELS: ChannelRow[] = [
  { name: 'general' },
  { name: 'random' },
  { name: 'design-review', active: true },
  { name: 'product', unread: true },
  { name: 'engineering' }
]

interface MessageProps {
  avatar: string
  avatarBg: string
  name: string
  time: string
  body: React.ReactNode
  opacity: number
  translateY: number
}

const Message: React.FC<MessageProps> = ({
  avatar,
  avatarBg,
  name,
  time,
  body,
  opacity,
  translateY
}) => (
  <div
    style={{
      display: 'flex',
      gap: 14,
      padding: '10px 24px',
      opacity,
      transform: `translateY(${translateY}px)`
    }}
  >
    <div
      style={{
        width: 40,
        height: 40,
        borderRadius: 6,
        background: avatarBg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 17,
        fontWeight: 700,
        flexShrink: 0
      }}
    >
      {avatar}
    </div>
    <div style={{ flex: 1, color: SLACK_TEXT }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: '#fff' }}>{name}</div>
        <div style={{ fontSize: 12, color: SLACK_TEXT_MUTED }}>{time}</div>
      </div>
      <div style={{ marginTop: 4, fontSize: 15.5, lineHeight: 1.5 }}>{body}</div>
    </div>
  </div>
)

export const SceneSlackShare: React.FC = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  // Slack frame appears
  const slackEnter = spring({
    frame,
    fps,
    durationInFrames: 22,
    config: { damping: 22, stiffness: 130, mass: 0.55 }
  })
  const slackY = interpolate(slackEnter, [0, 1], [20, 0])

  // First message (Alice shares the link)
  const msg1 = spring({
    frame: frame - 14,
    fps,
    durationInFrames: 20,
    config: { damping: 24, stiffness: 140 }
  })

  // Link preview card grows in
  const card = spring({
    frame: frame - 38,
    fps,
    durationInFrames: 22,
    config: { damping: 22, stiffness: 130 }
  })

  // Second message (Bob joins)
  const msg2 = spring({
    frame: frame - 96,
    fps,
    durationInFrames: 18,
    config: { damping: 24, stiffness: 140 }
  })

  // Cursor approach + click on link
  const cursorAppear = interpolate(frame, [130, 148], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const cursorX = interpolate(frame, [130, 180], [1380, 750], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const cursorY = interpolate(frame, [130, 180], [620, 530], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })
  const linkHighlight = frame > 178 ? 1 : interpolate(frame, [165, 178], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  const exitStart = durationInFrames - 18
  const exit = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp'
  })

  return (
    <SceneFade fadeInFrames={10} fadeOutFrames={14}>
      <AbsoluteFill style={{ backgroundColor: '#0d1017' }} />

      {/* Slack 風 frame */}
      <AbsoluteFill
        style={{
          padding: 64,
          opacity: slackEnter * exit,
          transform: `translateY(${slackY}px)`,
          fontFamily:
            '"Lato", "Slack-Lato", "Inter", "Hiragino Sans", "Yu Gothic UI", "Noto Sans JP", -apple-system, sans-serif'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: SLACK_MAIN_BG,
            borderRadius: 14,
            border: `1px solid ${SLACK_BORDER}`,
            boxShadow: '0 30px 80px rgba(0,0,0,0.55)',
            display: 'flex',
            overflow: 'hidden'
          }}
        >
          {/* Workspace icon column (Slack の縦バー) */}
          <div
            style={{
              width: 72,
              background: SLACK_WORKSPACE_BG,
              padding: '18px 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
              borderRight: `1px solid rgba(0,0,0,0.3)`
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: '#fff',
                color: SLACK_WORKSPACE_BG,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontWeight: 800,
                border: '2px solid rgba(255,255,255,0.9)'
              }}
            >
              P
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.55)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 17,
                fontWeight: 700
              }}
            >
              +
            </div>
          </div>

          {/* Channel sidebar */}
          <div
            style={{
              width: 260,
              background: SLACK_SIDEBAR_BG,
              padding: '20px 0',
              borderRight: `1px solid ${SLACK_BORDER}`,
              color: SLACK_TEXT
            }}
          >
            <div
              style={{
                padding: '0 18px 14px 18px',
                fontSize: 18,
                fontWeight: 800,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                borderBottom: `1px solid ${SLACK_BORDER}`
              }}
            >
              Pencil Team
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 400,
                  color: SLACK_TEXT_MUTED,
                  marginLeft: 'auto'
                }}
              >
                ⌄
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                color: SLACK_TEXT_MUTED,
                margin: '14px 18px 6px',
                letterSpacing: '0.02em',
                fontWeight: 600
              }}
            >
              ▾ チャンネル
            </div>
            {CHANNELS.map((ch) => (
              <div
                key={ch.name}
                style={{
                  padding: '4px 18px',
                  marginBottom: 1,
                  background: ch.active ? 'rgba(29,155,209,0.85)' : 'transparent',
                  color: ch.active ? '#fff' : SLACK_TEXT,
                  fontSize: 15,
                  fontWeight: ch.active || ch.unread ? 700 : 400,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 7
                }}
              >
                <span style={{ opacity: 0.85, fontWeight: 400 }}>#</span>
                {ch.name}
              </div>
            ))}
          </div>

          {/* Main pane */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            {/* Channel header */}
            <div
              style={{
                padding: '16px 26px',
                borderBottom: `1px solid ${SLACK_BORDER}`,
                color: '#fff',
                display: 'flex',
                alignItems: 'baseline',
                gap: 10
              }}
            >
              <div style={{ fontSize: 21, fontWeight: 800 }}>
                <span style={{ opacity: 0.7, marginRight: 4, fontWeight: 400 }}>#</span>
                design-review
              </div>
              <div style={{ fontSize: 13, color: SLACK_TEXT_MUTED }}>
                · 3 メンバー · デザインレビューと共有
              </div>
            </div>

            {/* Message area */}
            <div style={{ flex: 1, padding: '12px 0', overflow: 'hidden' }}>
              <Message
                avatar="A"
                avatarBg="#e8a87c"
                name="Alice"
                time="13:42"
                opacity={msg1}
                translateY={interpolate(msg1, [0, 1], [10, 0])}
                body={
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      Replay Marketing のデザイン共有します。 ブラウザでそのまま開けます 🙏
                    </div>

                    {/* Slack Link Preview Card */}
                    <div
                      style={{
                        marginTop: 4,
                        maxWidth: 560,
                        display: 'flex',
                        gap: 12,
                        opacity: card,
                        transform: `translateY(${interpolate(card, [0, 1], [6, 0])}px)`
                      }}
                    >
                      {/* 左の色付き縦バー (Slack の link preview スタイル) */}
                      <div
                        style={{
                          width: 4,
                          borderRadius: 2,
                          background: linkHighlight > 0 ? BRAND_PURPLE : 'rgba(124,140,255,0.55)',
                          flexShrink: 0
                        }}
                      />
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            fontSize: 13,
                            color: SLACK_TEXT_MUTED,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            marginBottom: 4
                          }}
                        >
                          <div
                            style={{
                              width: 16,
                              height: 16,
                              background: BRAND_PURPLE,
                              borderRadius: 4,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 10,
                              fontWeight: 800,
                              color: '#fff'
                            }}
                          >
                            P
                          </div>
                          <span>Pencil Editor</span>
                        </div>
                        <a
                          style={{
                            fontSize: 16,
                            fontWeight: 700,
                            color: SLACK_LINK,
                            textDecoration: linkHighlight > 0 ? 'underline' : 'none',
                            display: 'block',
                            marginBottom: 6,
                            background:
                              linkHighlight > 0 ? 'rgba(29,155,209,0.12)' : 'transparent',
                            padding: '2px 4px',
                            borderRadius: 4,
                            margin: '0 -4px 6px -4px',
                            transition: 'background 200ms ease'
                          }}
                        >
                          Replay Marketing をブラウザで開く
                        </a>
                        <div
                          style={{
                            fontSize: 14,
                            color: SLACK_TEXT,
                            lineHeight: 1.45,
                            marginBottom: 6
                          }}
                        >
                          招待リンクから 1 クリックで開けます。 ログイン不要、 そのまま編集できます。
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: SLACK_TEXT_MUTED,
                            fontFamily: 'ui-monospace, SFMono-Regular, monospace'
                          }}
                        >
                          pencil-editor.fly.dev/invite/eyJhbGc...
                        </div>
                      </div>
                    </div>
                  </div>
                }
              />

              <Message
                avatar="B"
                avatarBg="#5b8def"
                name="Bob"
                time="13:43"
                opacity={msg2}
                translateY={interpolate(msg2, [0, 1], [10, 0])}
                body={
                  <div>
                    見てみる！ ブラウザでそのまま開けるの最高だね 👀
                  </div>
                }
              />
            </div>

            {/* Composer mock */}
            <div
              style={{
                padding: '12px 26px 20px 26px',
                borderTop: `1px solid ${SLACK_BORDER}`
              }}
            >
              <div
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${SLACK_BORDER}`,
                  borderRadius: 10,
                  padding: '12px 16px',
                  fontSize: 14,
                  color: SLACK_TEXT_MUTED
                }}
              >
                #design-review にメッセージ
              </div>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Cursor overlay */}
      <div
        style={{
          position: 'absolute',
          left: cursorX,
          top: cursorY,
          width: 30,
          height: 30,
          pointerEvents: 'none',
          opacity: cursorAppear * exit,
          filter: 'drop-shadow(0 0 6px rgba(0,0,0,0.4))'
        }}
      >
        <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M6 4 L26 18 L17 19 L22 28 L18 30 L13 21 L6 26 Z"
            fill="#ffffff"
            stroke="#0d1017"
            strokeWidth={2}
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <Vignette strength={0.3} />

      <Caption
        tag="09 / Slack で配布"
        title="リンクを踏むだけで、 チームメイトが参加"
        subtitle="Slack でも LINE でも、 共有先はどこでもいい"
        variant="side"
      />
    </SceneFade>
  )
}
