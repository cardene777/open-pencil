# 04: Slides (プレゼン資料)

1920x1080 16:9 のプレゼンスライド用。 typography scale (min 28 / body 36 / title 80-200) は公式 slides reference から AI が自動適用。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【主題】
- プレゼンタイトル:
- 想定オーディエンス (1 文):
- 目的 (例「投資判断 / 機能紹介 / 採用 / 受注」):
- 全体時間と想定 slide 数 (例「8 分 / 10 slide」):

【トーン】
- 方向性 (corp / startup / marketing / internal / keynote のいずれか or 自由 3-5 語):

【含めたい slide】(順序込みで番号と用途を列挙)
- slide 01 Cover
- slide 02 ...
- slide N Final CTA + 連絡先

各 slide は **用途だけ書く** (中身の文字は AI が起こす)
- 例: slide 03 「製品の課題 = 既存ツールの問題提起」
- 例: slide 06 「機能ハイライト = 3 つの差別化」
```

## Optional

```
【ブランド】
- メインカラー:
- ロゴ画像 path (任意):
- 既存テンプレ (.fig) 参照 path:

【特有要素】
- 「QR コード placeholder 必須」
- 「データグラフ多め」
- 「写真ベース / 文字ベース」等

【言語】
- (default 英語、 日本語スライドなら明記)
```

## AI が公式 slides reference から自動補完

- 16:9 / 1920x1080 厳守
- font family **最大 2** (公式必須)
- minimum fontSize 28 / body 36 / title 80-200 / key number 120-200
- weight で強調 (size を増やさない)
- ALL CAPS は label のみ
- line-height ~1.1
- 高 contrast 必須
- edge から 100+ px の安全領域
- 1 slide = 1 idea
- layout-01 〜 layout-06 contract (Cover / BoldCover / SectionBreak / KeyStatement / Concept+Visual 2 種)
- 3 core color + neutral (公式)
- Anti-clutter (詰め込まない、 split or remove)
- CRAP (Contrast / Repetition / Alignment / Proximity)
- 各 slide の中身 (タイトル文 / body 文 / 数値 / icon)

## サンプル

```
/pencil-design

【出力】design/slides-pencil-launch.fig + .pen

【主題】
- プレゼンタイトル: pencil-editor 機能紹介
- 想定オーディエンス: フロントエンドエンジニア + デザイナー 30-50 名、 オンライン Zoom + プロジェクター両対応
- 目的: 「触ってみたい」と思わせる、 ウェイトリスト登録誘導
- 全体時間と想定 slide 数: 8 分 / 10 slide

【トーン】
- editorial minimalism / dark + 大型 typography

【含めたい slide】
- 01 Cover (タイトル + サブタイトル + 発表者)
- 02 KeyStatement (大きな問い)
- 03 SectionBreak (THE PROBLEM)
- 04 Concept+Visual (デザインとコードを分けない という考え方)
- 05 SectionBreak (WHAT YOU GET)
- 06 3 feature 横並び
- 07 KeyStatement
- 08 Concept+Visual (ローカル動作の説明)
- 09 数値 3 つ (GitHub star / Discord member / NPS)
- 10 Final CTA + QR

【ブランド】
- メインカラー: dark navy 系
- アクセント: lime
```

## さらに短い指示

```
/pencil-design

design/slides-pencil-launch.fig + .pen。
pencil-editor 機能紹介、 8 分、 10 slide、 オンライン + プロジェクター。
editorial minimalism、 dark + lime。
Cover / Problem / 機能 3 件 / 数値 / Final CTA QR の流れで。
```

## 修正指示

```
slide 06 の icon もっとシンプルに
slide 09 の数値を 4 つに増やして
全 slide にページ番号と発表者名を footer に
deck 内 1 枚 dark でなく white slide も入れる
```
