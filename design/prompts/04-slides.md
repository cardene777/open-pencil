# 04: Slides (プレゼン資料)

1920x1080 16:9 のプレゼンスライド用。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
font 数値 (min 28 / body 36 / title 80-200) / layout 構造は公式 slides reference 由来で AI が自動適用。

## プロンプト

~~~text
/pencil-design

[主題]
- プレゼンタイトル: <例 pencil-editor 機能紹介>
- 想定オーディエンス (1 文): <例 フロントエンドエンジニア + デザイナー 30-50 名、 オンライン Zoom + プロジェクター両対応>
- 目的: <例 「触ってみたい」と思わせる、 ウェイトリスト登録誘導 / 投資判断 / 受注 / 採用>
- 全体時間 / slide 数: <例 8 分 / 10 slide>

[トーン (3-5 語)]
- <例 editorial minimalism / dark + 大型 typography>
- <or 自由: corp / startup / marketing / internal / keynote>

[含めたい slide (順序込みで列挙、 中身の文字は AI に任せる)]
- 01 Cover (タイトル + サブタイトル + 発表者)
- 02 KeyStatement (大きな問い)
- 03 SectionBreak (THE PROBLEM)
- 04 Concept + Visual (考え方の説明)
- 05 SectionBreak (WHAT YOU GET)
- 06 3 feature 横並び
- 07 KeyStatement
- 08 Concept + Visual (実装の説明)
- 09 数値 3 つ (stars / members / NPS 等)
- 10 Final CTA + QR コード

(↑ 順序自由、 用途だけ書けば中身は AI が起こす)

[ブランド (任意)]
- メインカラー: <例 dark navy 系 / 任意>
- アクセント: <例 lime / 任意>
- ロゴ画像 path: <任意>
- 既存テンプレ .fig 参照: <任意>

[特有要素 (任意)]
- <例 QR コード placeholder 必須 (final slide)>
- <例 データグラフ多め>
- <例 写真ベース vs 文字ベース>

[言語]
- <default 英語、 日本語スライドなら明記>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全 slide を縦に並べた overview PNG と、 各 slide 個別 PNG を /tmp に保存して Read。
- 16:9 1920x1080 厳守、 font family 最大 2、 min fontSize 28、 edge から 100+ padding、
  1 slide = 1 idea、 layout-01〜06 contract は
  ~/.claude/skills/pencil-design/references/slides.md の公式値を守って。
- ALL CAPS は label のみ、 line-height ~1.1、 高 contrast。
~~~

## 補足

- 修正は自然文: 「slide 06 の icon もっとシンプルに」「全 slide に footer 追加 (ページ番号 + 発表者名)」「deck 内 1 枚 white slide も入れる」
- slide の中身の文字は用途だけ書けば AI が業種から起こす
- ロゴ画像があるなら Optional に path を書くと反映される

## AI が補完する内容

- 16:9 / 1920x1080 厳守
- font family 最大 2 (公式必須)
- minimum fontSize 28 / body 36 / title 80-200 / key number 120-200
- weight で強調 (size を増やさない)
- ALL CAPS は label のみ
- line-height ~1.1
- 高 contrast
- edge から 100+ px 安全領域
- 1 slide = 1 idea
- layout-01 〜 layout-06 contract (Cover / BoldCover / SectionBreak / KeyStatement / Concept+Visual 2 種)
- 3 core color + neutral
- 各 slide の中身の文字 (タイトル / body / 数値 / icon)
