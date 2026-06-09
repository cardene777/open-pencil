# 03: Mobile App (1 画面)

iOS / Android アプリの 1 画面用。 Status Bar 62 / Tab Bar 36 等の公式 spec は AI が自動適用。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
全ピクセル数値 (Status Bar 62 / Pill 36 等) は公式 mobile-app reference 由来で AI が自動適用するので書かなくていい。

## プロンプト

~~~text
/pencil-design

[製品]
- 名前: <例 Plate>
- 1 文の説明: <例 食事記録 + 栄養トラッキング app>
- 業種・カテゴリ: <例 ヘルスケア>
- 対象ユーザー: <例 25-35 歳、 健康志向の knowledge worker>
- この画面の primary intent (1 文): <例 今日の食事ログを 3 タップで完了>

[画面構成]
- 画面の種類: <Home / List / Detail / Form / Settings / Onboarding / Auth のいずれか>
- platform: <iOS / Android / 両対応>

[主要要素 (必要なものだけ)]
- 上部 header: <例 greeting + 日付 + notification icon>
- メインの content: <例 PFC 進捗 card / 今日の食事 timeline 3 件 / quick add 推奨>
- Bottom Tab Bar: <有 (5 tab、 用途) / 無、 有なら tab 名カンマ区切り>
- 浮遊 CTA (FAB): <有 (icon / 動作) / 無>

[トーン (3-5 語)]
- <例 warm minimalism / 紙質感 / friendly>

[ブランド (任意)]
- メインカラー: <例 深緑系 / 任意>
- アクセント: <例 暖かいイエロー / 任意>

[特有要素 (任意)]
- <例 dark mode 想定>
- <例 voice input 対応>
- <例 camera 統合 必須>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全体 PNG (1x + 2x) と Tab Bar 単独 PNG を /tmp に保存して Read。
- Status Bar 62 px / Wrapper 単一 stack / 全 Title font size 統一 /
  Tab Bar 数値 (Pill 62 / 36 radius / Tab item 26 / Icon 18 / Label 10) は
  ~/.claude/skills/pencil-design/references/mobile-app.md の公式値を厳守。
- One-handed reach (CTA は lower half)、 loading / empty / error / success の 4 states も考慮。
~~~

## 補足

- 修正は自然文: 「Tab Bar の中央 + を camera icon に」「greeting の絵文字外して」「dark mode 版も別 page に」
- 数値・hex は AI 任せで OK
- アプリ全体 (Onboarding / Auth / Home / Detail / Settings 全部) を一気に作るなら `13-mobile-app-full.md` を使う

## AI が補完する内容

- Status Bar 62 px (公式必須値)
- Wrapper container (公式 CRITICAL: 全要素を 1 vertical stack に)
- 全 Title font size を画面横断で統一
- gap-based vertical spacing (margin 不使用)
- Bottom Tab Bar 数値 (公式値、 Pill 62 高 / 36 radius / Tab item 26 radius / Icon 18 / Label 10 / letter-spacing 0.5 / uppercase)
- One-handed reach (CTA を lower half)
- 4 states (loading / empty / error / success)
- Touch target 適正サイズ
- safe area / status bar inset
- 全カラー / 全コピー文 / フォント / radius / shadow / icon 名 (lucide / SF Symbols)
