# Prototype Mode 仕様書

inkly で作成した FRAME を「1 サイト」として動作させるためのプロトタイプモード全体仕様。 figma の Prototype 機能に相当する。 本書は親 Issue #192 配下の Phase 1-4 を貫く SSOT。

## 1. ゴール

- 単一 board 内の複数 FRAME を、 ユーザー操作 (click / hover) で遷移できる「サイト」として連続表示
- 階層構造 (parent FRAME → 子 FRAME) を「ページツリー」として明示
- 編集画面の「Play」ボタンで preview ウィンドウを開き、 reaction を JS で実行
- 「Export site」 で静的 HTML / CSS / JS / asset を zip 出力、 ローカル http で動作

## 2. 用語

- **Frame** ... 1 画面に相当する FRAME 型 SceneNode
- **Reaction** ... 「trigger + action + targetFrameId」 の組み (例 onClick → navigate to FRAME B)
- **Start Frame** ... preview / export の entry point となる FRAME
- **Frame Tree** ... FRAME の parent 関係で表現される階層 (sitemap.xml で export 時に使う)
- **Play Mode** ... preview ウィンドウで reaction を実行する mode
- **Export Site** ... 全 frame を 1 サイトとして zip 出力する経路

## 3. データモデル

### 3.1 SceneNode 拡張

`packages/core/src/scene-graph/types.ts`

```ts
export interface PrototypeReaction {
  /** trigger 種別 */
  trigger: 'onClick' | 'onHover' | 'onMouseDown' | 'afterDelay'
  /** afterDelay の場合 ms 単位 */
  delayMs?: number
  /** action 種別 */
  action: 'navigate' | 'openOverlay' | 'closeOverlay' | 'back' | 'externalUrl'
  /** navigate / openOverlay の遷移先 FRAME id */
  targetFrameId?: string
  /** externalUrl の場合の URL */
  externalUrl?: string
  /** navigate の transition アニメーション */
  transition?: 'instant' | 'dissolve' | 'slideLeft' | 'slideRight'
  /** ms 単位 (transition duration) */
  transitionDurationMs?: number
}

export interface SceneNode {
  // ... 既存 fields
  /** prototype reactions、 FRAME のみが持つ (それ以外の type では undefined) */
  reactions?: PrototypeReaction[]
}
```

### 3.2 BoardRecord 拡張

`packages/api/src/types.ts`

```ts
export interface BoardRecord {
  // ... 既存
  /** preview / export の entry point となる FRAME id、 未設定なら最初の FRAME */
  startFrameId: string | null
}
```

### 3.3 Frame 階層

階層は SceneNode の既存 `parentId` を活用する。 ただし「prototype 階層」は scene 上の親子関係 (描画階層) とは別概念のため、 必要に応じて以下を追加検討する。

```ts
export interface SceneNode {
  // ... 既存
  /** prototype 階層上の親 FRAME id、 描画上の parentId とは別 (sitemap 用) */
  prototypeParentFrameId?: string
}
```

ただし重複情報になるため、 描画 parentId をそのまま流用する選択も可。 Phase 1 では描画 parentId 流用、 Phase 4 (export) で必要なら別 field 検討。

## 4. データベース migration

migration 0009 で `boards.start_frame_id` 列を追加。

```sql
ALTER TABLE boards ADD COLUMN start_frame_id TEXT;
```

外部 key 制約は付けない (FRAME 削除 → start_frame_id が壊れる前にチェックする責務は API 側)。

## 5. API endpoint

### PATCH /api/boards/:id/start-frame

```json
{ "startFrameId": "node-uuid" | null }
```

- 認可 ... board owner のみ
- response ... `{ board: BoardRecord }`

### Reaction の永続化

reactions は SceneNode の一部として既存の board document 経路で保存される (別 endpoint 不要)。 board の document JSON / fig binary の codec が PrototypeReaction を含む必要あり (`@inkly/core` の codec を拡張)。

## 6. 編集 UI (Phase 2)

### 6.1 PrototypePanel

```
src/components/PrototypePanel.vue
```

- 選択中 FRAME の reactions を編集 (追加 / 削除 / 再 ordering)
- trigger / action / targetFrameId / transition を form で編集
- target frame は「board 内 FRAME 一覧」 dropdown から選択

### 6.2 Pages tree

```
src/components/PagesPanel.vue (既存改修)
```

- 階層 tree で FRAME 一覧を表示
- 「Start frame に指定」 ボタン (★ icon)
- 「Open in preview」 ボタン (▶ icon)

## 7. Play モード (Phase 3)

### 7.1 PreviewView

```
src/views/PreviewView.vue (新規)
```

route ... `/board/:id/preview?startFrame={id}`

- board document を fetch
- 既存 CANVAS renderer (`@inkly/core`) を `preview-mode=true` で起動
- 全 FRAME を render し、 startFrame のみ可視、 他は hidden
- click event を listen し reaction を JS で実行 (navigate なら別 FRAME を可視化)
- 「Back」 ボタン (history stack)
- 「Reset to start」 ボタン
- 「Close」 ボタン (編集に戻る)

### 7.2 reaction の JS 実行

```ts
function handleClick(frameId: string, evt: MouseEvent) {
  const reactions = graph.getNode(frameId)?.reactions ?? []
  const clickReaction = reactions.find(r => r.trigger === 'onClick')
  if (!clickReaction) return
  switch (clickReaction.action) {
    case 'navigate':
      navigateTo(clickReaction.targetFrameId, clickReaction.transition)
      break
    case 'openOverlay':
      openOverlay(clickReaction.targetFrameId)
      break
    case 'back':
      history.back()
      break
    case 'externalUrl':
      window.open(clickReaction.externalUrl, '_blank')
      break
  }
}
```

## 8. 静的サイト export (Phase 4)

### 8.1 file 構成

```
output.zip
├── index.html              ← startFrame
├── frames/
│   ├── frame-{id}.html     ← 各 FRAME 1 HTML
├── assets/
│   ├── images/
│   ├── fonts/
│   └── styles.css
├── scripts/
│   └── prototype.js        ← reaction handler
└── sitemap.xml             ← frame 階層
```

### 8.2 SVG → HTML 変換

既存 `renderNodesToSVG` を流用、 出力 SVG を `<div class="frame">` の中に inline embed。 reaction は `<a href="frames/frame-{targetId}.html">` でラップ。 transition アニメーションは CSS variable + JS で実装。

### 8.3 sitemap.xml

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>index.html</loc></url>
  <url><loc>frames/frame-{id}.html</loc></url>
  ...
</urlset>
```

階層構造は url 内に <lastmod> や独自 <parent> tag で表現可能 (sitemap 拡張)、 Phase 4 で詳細決定。

## 9. e2e test 戦略

| Phase | 検証内容 |
|---|---|
| Phase 1 | scene-graph 型 unit test、 codec round-trip test |
| Phase 2 | 編集画面で reaction を追加 → 保存 → 再 load して persistent |
| Phase 3 | Play モードで navigate が動作、 Back / Reset が動作 |
| Phase 4 | export zip 解凍 → ローカル http server で index.html → click navigate 動作 |

## 10. 非ゴール

- 複雑な animation editor (figma の motion 設定相当)
- form / input handling (button の onClick navigate のみ、 input value は持たない)
- 認証付きサイト export (公開静的サイトのみ)
- マルチ言語 (i18n) site export

これらは追加 Issue で別途検討。

## 11. 参照

- 親 Issue #192
- 子 Issue #193 (Phase 1) #194 (Phase 2) #195 (Phase 3) #196 (Phase 4)
- 既存 PDF export ... packages/core/src/io/formats/pdf/export.ts (SVG 経由の export 経路の参考)
- 既存 SVG export ... packages/core/src/io/formats/svg/

## 12. 進め方の注意

- Phase 1 (#193) ... scene-graph + 仕様書 + migration、 既存挙動への影響なし
- Phase 2 (#194) ... UI 追加、 既存編集機能と干渉しないよう dropdown / panel 分離
- Phase 3 (#195) ... Play モードは新規 view、 既存 EditorView に影響なし
- Phase 4 (#196) ... export は新規 formatter、 既存 PDF / SVG export と並列追加

各 Phase は独立 PR とし、 stacked PR で前 Phase が前提となる場合は base を前 Phase の branch にする。
