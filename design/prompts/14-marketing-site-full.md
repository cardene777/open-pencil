# 14: Marketing Site 全体 (full multi-screen)

製品コーポレートサイトや multi-page marketing site の全画面を 1 プロンプトで生成。

## 含まれる画面 (12 画面)

| グループ | 画面 |
|---|---|
| Public (8) | Home / Product / Features / Pricing / About / Customers / Blog index / Blog post |
| Resources (2) | Docs landing / Changelog |
| Conversion (2) | Demo request / Sales contact |

## 最強サンプル

```
/pencil-design

design/marketing-site.fig + .pen に書き出して。

【プロジェクト】
- 製品: Stride — 中小企業向け人事 SaaS (採用 + 評価 + 給与)
- ターゲット: 50-500 名規模の企業の HR / 経営陣
- primary conversion: デモリクエスト / 営業問い合わせ
- バイラル / SEO 軸: 採用関連の Long-form blog content
- 競合: BambooHR / Gusto / SmartHR (国内)

【全体トーン】
- 美学: confident corporate + 親しみやすさ、 enterprise だが人間味
- bg #FFFFFF / off-white #F8F9FB / dark section #0F1419
- accent #4F46E5 (indigo)、 sub-accent #06B6D4 (cyan、 highlights)
- text primary #0F1419 / secondary #475467 / tertiary #98A2B3
- success #10B981 / warning #F59E0B
- フォント: heading "Inter Display" Bold / body "Inter" / mono "JetBrains Mono"
- radius: card 16 / button 10 / pill 999
- shadow: card #0F141A0A blur 16 offset y 4

【ページ全 1440 幅、 縦 fit_content】

【ナビゲーション (全ページ共通 header)】
- 高 88
- 左: logo "stride" Bold 28 + dropdown nav (Product / Solutions / Customers / Pricing / Resources)
- 中央: 何もなし
- 右: "Sign in" link + "Get demo" primary CTA accent
- mobile breakpoint で hamburger menu (今回省略)

【フッター (全ページ共通)】
- 高 480 bg #0F1419 white text
- 上部 80 newsletter card (split): "Get HR insights weekly" + email input + button
- 中央 6 column nav (Product / Solutions / Resources / Company / Legal / Social)、 各 4-5 link
- 下部 copyright + small "Made with care" + social icons

==================================================================
【Public Pages (y=0 から、 各別 x)】
==================================================================

▼ Screen/Home (x=0, y=0、 1440 × 4800)
- header
- Hero 800 (large、 split 60/40):
  - 左: badge "NEW · 2026 Edition"、 headline 80 "HR that works the way your team does." 、 sub 22 "Stride replaces 7 tools so HR can focus on people, not paperwork." 、 CTA 2 "Get a demo" + "See pricing"、 trust line "Used by 4,200+ teams"
  - 右: 大型 product mockup placeholder 16:10
- Logo bar 120: "From scale-ups to public companies" eyebrow + 8 ロゴ
- Problem section 600 bg off-white: "HR is breaking" + 3 stat card (47% admin time / 12 tools avg / 6 months recruiting)
- "How Stride solves it" 720: split 50/50、 左 list 5 bullet、 右 demo gif placeholder
- Product overview 4 sections 各 640 (左右交互):
  - "Recruit smarter" feature card
  - "Onboard in minutes" 
  - "Run payroll on autopilot"
  - "Evaluate fairly"
  - 各: title + body + 2-3 bullet + mockup
- Customer story 480: 大型 quote + photo + result stats (3 metric)
- Testimonial wall 600: 9 quote grid 3x3 (各 small card)
- Integration logos 320: "Plays well with" + 12 logo grid
- Pricing teaser 360: 3 mini tier + "See full pricing" CTA
- Demo request CTA 320 bg accent: "See Stride in 15 minutes" + button "Book a demo"
- Footer

▼ Screen/Product (x=1640, y=0、 1440 × 4000)
- header
- Hero 600 darker: badge "PRODUCT" + title 64 "Built for modern HR teams." + sub + CTA "Watch tour"
- Anchor nav sticky 80 (横並び 5 link、 active underline): "Recruit / Onboard / Manage / Pay / Evaluate"
- 5 section 各 720 (alternating bg):
  - Recruit (image 左 + 文字右): title + 3 bullet + 5 sub-feature card grid 3x2
  - Onboard: workflow visualization placeholder
  - Manage: dashboard mockup
  - Pay: 安心感のあるラベル + 説明
  - Evaluate: 360 review screenshot
- Bottom CTA 320

▼ Screen/Features (x=3280, y=0、 1440 × 3600)
- header
- Hero 400: "Every feature in one place."
- Filter pills sticky 64: All / Recruit / Onboard / Manage / Pay / Evaluate / Reports / Integrations
- 12 feature card grid 4 col x 3 row (各 320x280):
  - 各 icon 40 + name + 1 line desc + "Learn more →"
- bottom CTA

▼ Screen/Pricing (x=4920, y=0、 1440 × 3200)
- header
- Hero 280: "Pricing built for HR teams of all sizes."
- toggle 60: Monthly / Annual (Save 20%)
- 3 tier grid 720 (各 padding 40 radius 16):
  - Starter $8/employee/mo (small team)
  - Pro $14/employee/mo (highlighted、 accent border、 "Most popular" badge top right)
  - Enterprise Custom (talk to sales)
  - 各: price + 機能 8 行 (each line with checkmark) + CTA
- Feature comparison table 1200 (24 row、 4 列): 公式 design-system reference の table 仕様
- ROI calculator section 600 split: 左 slider input + result、 右 graph
- FAQ 600: 6 件 accordion
- Final CTA 320

▼ Screen/About (x=6560, y=0、 1440 × 3600)
- header
- Hero 600 split: "We're building the future of HR" + sub + team photo collage right
- Story section 600 long form text 2 col
- Values section 480: 4 value card (各 icon + name + body)
- Team section 720: leadership team 8 person grid 4x2 (各 photo + name + role + LinkedIn icon)
- Press section 360: featured logos + selected articles
- Office locations 320: 3 city card (Tokyo / SF / Berlin) + 詳細
- Career CTA 320
- Footer

▼ Screen/Customers (x=8200, y=0、 1440 × 3200)
- header
- Hero 360: "Trusted by 4,200+ teams worldwide."
- Stats row 200: 4 大数値 (4,200 teams / 280K employees managed / 99.8% retention / 4.9★ G2 rating)
- Featured case study 720: 大型 (split 左 quote + customer info、 右 photo) "Acme HR saved 32 hours/week" + "Read full story →"
- Customer logos wall 320 4x3 (大きめ ロゴ 12)
- Industry-specific testimonials 800: 4 industry section (Tech / Healthcare / Finance / Retail)、 各 quote + result
- Customer reviews 480: G2 / Capterra スコア + 3 review excerpt
- CTA section

▼ Screen/BlogIndex (x=9840, y=0、 1440 × 3600)
- header
- Hero 280: "HR insights, news, and tips."
- Filter bar 80: Categories chip row (All / Recruitment / Compensation / Culture / Leadership / Tools) + search
- Featured post 400: 大型 (split image left + content right)
- Recent posts grid 4 col x 3 row = 12 (各 320x320: image + category badge + title 18 Bold + excerpt + author + read time)
- Pagination
- Newsletter inline CTA

▼ Screen/BlogPost (x=11480, y=0、 1440 × 4400)
- header
- Article hero 280: breadcrumb + title 56 + meta (author avatar + name + date + read time)
- Featured image 480 (full width 16:9)
- 2 col main (left content 880 / right sidebar 280 sticky):
  - 左 long form article: 8-10 paragraph + 2 inline image + 1 pull quote + 1 code block
  - 右 sidebar: TOC + author card + related posts 3
- bottom: tags + share row + author bio expanded card
- Related articles 480 (3 card)
- Comments section 480 (3 comments + form)

==================================================================
【Resources (y=5000)】
==================================================================

▼ Screen/Docs/Landing (x=0, y=5000、 1440 × 3000)
- header (different: docs.stride.com 表示)
- Hero 320: "Docs" + sub + 大型 search bar
- 6 category card grid 3 col x 2 (各 320x240):
  - Getting started / API reference / Integrations / Workflows / Compliance / Migration
  - 各 icon + name + 説明 + "12 articles"
- Popular articles list 400 (5 row)
- Videos section 320 (3 video card)
- Footer custom for docs

▼ Screen/Changelog (x=1640, y=5000、 1440 × 3200)
- header
- Hero 240: "Changelog" + sub "Updates and improvements"
- Filter chips: All / New / Improved / Fixed
- Date-grouped entries 縦 list (各 entry: date sticker + version badge + type badge + title + body 2-3 line + screenshot optional):
  - 8 entry sample
- RSS / subscribe CTA bottom

==================================================================
【Conversion (y=8000)】
==================================================================

▼ Screen/DemoRequest (x=0, y=8000、 1440 × 1200)
- minimal header (logo only、 no nav distraction)
- 2 col split:
  - 左 (padding 80) info:
    - badge "GET A DEMO"
    - title 56 "See Stride in 15 minutes."
    - sub long body 24
    - 3 bullet "What you'll see"
    - testimonial mini card (avatar + quote + name)
    - trust badges 4 (SOC 2 / GDPR / etc)
  - 右 form card (max 560 padding 40 radius 16 white shadow):
    - title "Book your demo"
    - 8 field form: Full name / Work email / Company / Job title / Team size (select) / Industry (select) / Use case (textarea) / Heard from (select)
    - checkbox terms
    - "Schedule demo" primary CTA full
    - footer text "No credit card. 15 minutes."
- footer minimal

▼ Screen/Sales (x=1640, y=8000、 1440 × 1200)
- 2 col similar
- 左 info: "Talk to our team" + use case bullet
- 右: contact form (less fields than demo) + 別 alternative card:
  - Phone "+81 3-XXXX-XXXX"
  - Email "sales@stride.com"
  - Office address (Tokyo / SF / Berlin)
  - Office hour info

==================================================================
【Components (x=14000)】

design system frame:
- Buttons (Primary / Secondary / Outline / Ghost、 各 small/medium/large)
- Forms (input / select / textarea / checkbox / radio)
- Cards (feature / pricing / customer / blog / testimonial)
- Badges (5)
- Tab system
- Modal templates
- Accordion (FAQ用)
- Stats row template
- Logo wall template
- Quote / testimonial template
- Code block template
- Documentation sidebar nav template

==================================================================
【公式 reference の遵守】

- landing-page reference を 全 marketing 系で適用
  - 特に Brief Hard Gate / Hero rules / Content Guidelines / Anti-Slop
- Imagery Hierarchy: transformation imagery 重視
- design-system reference の spacing table / button hierarchy
- 8-9 ページ繋がりの consistency (header / footer / navigation)
- B2B SaaS の trust building (security badges / compliance / customer logos / case study)

【Anti-pattern (絶対ダメ)】
- Header の inconsistency (全 page で同じ nav 構造)
- Footer の差異 (全 page で同じ footer)
- 競合する CTA (各 page に primary CTA 1 つ)
- 同じ trust badge を別形式で繰り返し

【完了時】
- 全 12 画面 placeholder false
- group PNG (Public 8 / Resources 2 / Conversion 2)
- Header & Footer 単独 PNG
- Components 単独
- .fig + .pen
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen
【プロジェクト】<製品> ── B2B SaaS / B2C Service、 ターゲット、 primary conversion
【トーン】confident corporate / friendly / minimal、 カラー、 フォント
【画面 12】Public 8 (Home / Product / Features / Pricing / About / Customers / Blog index / Blog post) + Resources 2 (Docs / Changelog) + Conversion 2 (Demo / Sales) + Components
【共通】header (logo + nav + CTA) / footer (newsletter + 6 col link + copyright) を全 page で identical
【完了時】12 画面、 group PNG、 .fig + .pen
```
