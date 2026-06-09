# 04: Slides プロンプトテンプレ

プレゼン資料 (1920 × 1080) 用。 公式 slides reference の typography 数値 / layout contract に従う。

## 最強サンプル (細かい指示)

```
/pencil-design

design/slides-pencil-launch.fig + .pen に書き出して。

【タイプ】Slides (プレゼン deck、 16:9 1920x1080)

【主題】
- title: pencil-editor (OSS デザインツール) 機能紹介プレゼン
- 想定オーディエンス: フロントエンドエンジニア + デザイナー 30-50 名規模、 オンライン Zoom + プロジェクター両対応
- 目的: 「触ってみたい」と思わせる、 wait list 登録誘導 (final slide で QR)
- 全体時間: 8 分 (10 slide 想定)

【トーン・美学】
- 方向性: editorial minimalism、 dark + 大きな typography
- bg #0A0E18 (near black) / accent #B3D056 (lime) / text white #FFFFFF
- 副カラー: muted #8089A0、 dim #4A5160
- フォント: title "Söhne" or "Inter" Bold、 body "Inter" Regular、 mono "JetBrains Mono"
- 全 slide で 100+ px の edge padding 厳守 (公式 slides reference)

【全 10 slide】

slide 01 — Cover (layout-01 contract)
- center stack
- title "pencil-editor" (180px Inter Bold、 white、 lineHeight 1.0)
- subtitle "Design on canvas. Land in code." (80px white、 muted)
- meta "Cardene · 2026" (40px Inter、 #8089A0)
- bg #0A0E18 に subtle gradient (radial center lime 10% opacity)

slide 02 — KeyStatement (layout-04 contract)
- center
- 大型 statement "Designers and engineers ship the same artifact." (60px Bold、 white、 max 2 行)
- attribution 任意 (今回 omit)

slide 03 — Problem section break (layout-03)
- center、 余白多
- label "01 — THE PROBLEM" (28px、 muted、 letter-spacing 4)
- title "Design tools don't generate code." (56px Bold)

slide 04 — Concept + Visual (layout-05、 2col 50/50)
- 左: title "We treat .fig as code." (96px Bold) + body "Every change is a JS operation. Every export is a deploy." (40px、 lineHeight 1.3、 max 4 行)
- 右: 大きな code snippet placeholder (1.0 比率 frame、 inner monospace text 36px "const hero = figma.createFrame()...")、 bg #1A1F2E radius 24

slide 05 — Section break: feature (layout-03)
- label "02 — WHAT YOU GET"
- title "Six agents. One canvas."

slide 06 — Feature 3 column (custom 3col)
- 横並び 3 box、 各 padding 64、 gap 32
- 各 box: 大型 icon (96px ascii 文字 like "→" "⚡" "✦")、 title 36px Bold、 description 28px regular max 4 行
- 1. "Real code, not mockups" "Generate production React, Vue, Svelte directly from canvas. No export, no rebuild."
- 2. "Agent teams in parallel" "Up to 6 concurrent AI agents iterate on different components — review, refine, merge."
- 3. "Open source, local-first" "MIT licensed. Your data never leaves your machine. No vendor lock-in."

slide 07 — KeyStatement
- "Built for the next decade of software." (56px Bold)

slide 08 — Concept + Visual (layout-06、 image 左)
- 左: 大きな mock screenshot placeholder
- 右: title "It runs on your machine." (96px Bold) + body "No SaaS dependency. No telemetry. Just bun + JS. Works offline." (40px max 4 行)

slide 09 — Stats / Social proof
- 上に label "EARLY NUMBERS" (28px muted letter-spacing 2)
- 横並び 3 大数値:
  - "12,400" (120px Bold lime) "GitHub stars" (32px white)
  - "2,800" (120px) "Discord members"
  - "98%" (120px) "Recommend to peers"

slide 10 — Final CTA + QR
- center stack
- title "Start designing in code." (96px Bold)
- subtitle "Join the beta. MIT licensed. Free forever." (40px muted)
- QR placeholder (240x240 square、 bg white、 中に "QR" ascii)
- url "pencil.dev/beta" (32px mono lime)

【全 slide 共通】
- bg #0A0E18 (slide 04 / 08 のみ右側に lime gradient texture)
- footer thin line: 左 "pencil-editor · 1/10" 右 "@cardene_dev" (16px muted、 padding 64 下)
- title slide の bottom edge から 120px までは empty (cinematic)

【公式 slides reference の遵守 (絶対)】
- 16:9 比率 1920 × 1080 厳守
- font family 最大 2 (Inter + JetBrains Mono のみ)
- min fontSize 28 厳守 (どの slide でも body は 28px 以下にしない)
- body 36 / titles 80-200 / key numbers 120-200
- 全 slide で edge から 100+ px の安全領域
- 1 slide = 1 idea (KeyStatement / Section break は更に厳密)
- ALL CAPS は label のみ (eyebrow "01 — PROBLEM" 等のみ)
- line-height 1.1 程度
- 高 contrast 維持

【Anti pattern】
- font size を縮めて content を入れる (代わりに split or remove)
- decoration だけの visual (各 visual は意味を持つ)
- カラフルな pie chart (今回 dark + lime 1 アクセントのみ)

【完了時】
- 全 10 slide を 1 枚の縦並び PNG に export → /tmp/slides-deck.png
- 各 slide 個別 PNG → /tmp/slide-01.png 〜 /tmp/slide-10.png
- thumbnail / overview 用に 1920x1080 を 1280x720 で書き出し → /tmp/slides-thumb.png
- .fig + .pen 両方
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen
【タイプ】Slides (16:9 1920x1080、 <N> slide)
【主題】<タイトル> ── オーディエンス <X>、 目的 <Y>、 時間 <分>
【トーン】<editorial minimalism / corp structured / startup bold>、 bg <#XXX> accent <#YYY>
【フォント】<最大 2 family>
【slide list】上から
  01 Cover (layout-01)
  02 <KeyStatement / Section / Concept+Visual> (layout-XX)
  03 ...
  ...
  N Final CTA + QR
【各 slide】title "<英文>" / subtitle / body / 数値 / icon (各 fontSize 厳守)
【共通】edge padding 100+、 font family 2 まで、 body min 28、 ALL CAPS は label のみ
【完了時】.fig + .pen + slide 別 PNG
```
