import { AbsoluteFill, Sequence } from 'remotion'
import { SceneHero } from './scenes/SceneHero'
import { SceneTerminal } from './scenes/SceneTerminal'
import { SceneSplitDnD } from './scenes/SceneSplitDnD'
import { SceneFlowContinuous } from './scenes/SceneFlowContinuous'
import { SceneSlackShare } from './scenes/SceneSlackShare'
import { SceneOutro } from './scenes/SceneOutro'

const FPS = 60
const sec = (s: number) => Math.round(s * FPS)

// 合計 約 51 秒、 テンポ up
const HERO_DUR = sec(4)
const TERMINAL_DUR = sec(6.5)
const UPLOAD_DUR = sec(5)
const FLOW_DUR = sec(23) // Open + Edit + Share + Invite + Distribute (record-flow テンポ up 後)
const SLACK_DUR = sec(7) // チームメイトが Slack 経由で参加
const OUTRO_DUR = sec(5)

const FADE_OVERLAP = sec(0.25)

export const PencilEditorPromo: React.FC = () => {
  let cursor = 0

  const heroFrom = cursor
  cursor += HERO_DUR - FADE_OVERLAP

  const terminalFrom = cursor
  cursor += TERMINAL_DUR - FADE_OVERLAP

  const uploadFrom = cursor
  cursor += UPLOAD_DUR - FADE_OVERLAP

  const flowFrom = cursor
  cursor += FLOW_DUR - FADE_OVERLAP

  const slackFrom = cursor
  cursor += SLACK_DUR - FADE_OVERLAP

  const outroFrom = cursor

  return (
    <AbsoluteFill style={{ backgroundColor: '#0d1017' }}>
      <Sequence from={heroFrom} durationInFrames={HERO_DUR}>
        <SceneHero />
      </Sequence>

      <Sequence from={terminalFrom} durationInFrames={TERMINAL_DUR}>
        <SceneTerminal />
      </Sequence>

      <Sequence from={uploadFrom} durationInFrames={UPLOAD_DUR}>
        <SceneSplitDnD />
      </Sequence>

      <Sequence from={flowFrom} durationInFrames={FLOW_DUR}>
        <SceneFlowContinuous
          videoStartSec={7}
          captions={[
            {
              startSec: 0,
              endSec: 6,
              tag: '03 / Open .fig',
              title: 'ブラウザに .fig をドロップ',
              subtitle: '実際のエディタが、 そのまま開く'
            },
            {
              startSec: 6,
              endSec: 11,
              tag: '04 / Native',
              title: 'アップロードしたデザインを、 そのまま編集',
              subtitle: 'すべてのレイヤーが、 ブラウザの中で動く'
            },
            {
              startSec: 11,
              endSec: 15,
              tag: '05 / Share',
              title: 'チームに見せる',
              subtitle: 'ワンクリックで共有モーダルへ'
            },
            {
              startSec: 15,
              endSec: 19,
              tag: '06 / Invite',
              title: '招待 URL を発行',
              subtitle: '有効期限 7 日間、 ロール選択も可能'
            },
            {
              startSec: 19,
              endSec: 23,
              tag: '07 / Distribute',
              title: 'コピーして、 どこへでも',
              subtitle: 'Slack でも LINE でもメールでも'
            }
          ]}
        />
      </Sequence>

      <Sequence from={slackFrom} durationInFrames={SLACK_DUR}>
        <SceneSlackShare />
      </Sequence>

      <Sequence from={outroFrom} durationInFrames={OUTRO_DUR}>
        <SceneOutro />
      </Sequence>
    </AbsoluteFill>
  )
}
