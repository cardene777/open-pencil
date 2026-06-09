# 03: Mobile App (1 画面)

iOS / Android アプリの単一画面用。 ピクセル spec (Status Bar 62 / Tab Bar 36 radius 等) は AI が公式 mobile-app reference から自動適用。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品】
- 名前と 1 文の説明:
- 業種・カテゴリ:
- 対象ユーザー:
- この画面の primary intent (例「今日の食事を 3 タップで記録」):

【画面構成】
- 画面の種類 (Home / List / Detail / Form / Settings / Onboarding / Auth / etc):
- platform (iOS / Android / 両対応):

【主要要素】(必要なものだけ列挙)
- 上部 header (タイトル / 検索 / 戻る等):
- メインの content (例「今日のサマリ card」「list 5 行」「form 6 field」):
- Bottom Tab Bar の有無 (有なら tab 数と用途):
- 浮遊 CTA (FAB) の有無:

【トーン】(3-5 語):
```

## Optional

```
【ブランド】
- メインカラー:
- アクセント:

【特有要素】
- 「写真撮影フロー含む」
- 「voice input 対応」
- 「ダークモード」等
```

## AI が公式 mobile-app reference から自動補完

- Status Bar 62 px (公式値)
- Wrapper container (公式 CRITICAL: 全要素を 1 vertical stack に)
- 全 Title font size を画面横断で統一 (公式必須)
- gap-based vertical spacing (margin 不使用、 公式必須)
- Tab Bar の数値 spec (公式値、 Pill 62 高 / 36 radius / Tab item 26 radius / Icon 18 / Label 10 / letter-spacing 0.5 / uppercase)
- One-handed reach (CTA を lower half に配置)
- 4 states (loading / empty / error / success) を first-class
- Touch target 適正サイズ
- safe area / status bar inset 尊重
- 全カラー / 全コピー文 / フォント / radius / shadow / icon 名

## サンプル

```
/pencil-design

【出力】design/mobile-meal-home.fig + .pen

【製品】
- 名前と 1 文の説明: Plate ── 食事記録 + 栄養トラッキング app
- 業種・カテゴリ: ヘルスケア
- 対象ユーザー: 25-35 歳、 健康志向の knowledge worker
- この画面の primary intent: 今日の食事ログを 3 タップで完了

【画面構成】
- 画面の種類: Home (今日のサマリ)
- platform: iOS

【主要要素】
- 上部 header: greeting + 日付 + notification icon
- メインの content: PFC 進捗 card / 今日の食事 timeline (3 meal) / quick add 推奨
- Bottom Tab Bar: 5 tab (Today / Insights / + / Recipes / Profile)
- FAB: 中央 tab を + として赤い大円 (録音風)

【トーン】
- warm minimalism / 紙質感 / 信頼感

【ブランド】
- メインカラー: 深緑系
- アクセント: 暖かいイエロー
```

## さらに短い指示

```
/pencil-design

design/mobile-meal-home.fig + .pen。
Plate ── 食事記録アプリの Home 画面。 iOS。
今日の栄養サマリ + 食事 timeline + bottom tab 5 個。
warm minimalism、 深緑 + イエロー。
```

## 修正指示

```
Tab Bar の中央 + を camera icon に変えて
greeting の絵文字外して
PFC card を画面上部から中央に移動
ダークモード版も別 page に
```

## 関連 (アプリ全体を作りたい場合)

複数画面 (Onboarding / Auth / Home / List / Detail / Settings 全部) を 1 プロンプトで作るなら `13-mobile-app-full.md` を使う。 本 file は単一画面用。
