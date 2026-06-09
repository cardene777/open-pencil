# 03: Mobile App プロンプトテンプレ

iOS / Android アプリ画面用。 公式 mobile-app reference の数値 spec (Status Bar 62px / Pill 36 radius 等) を厳守。

## 最強サンプル (細かい指示の見本)

```
/pencil-design

design/mobile-meal-tracker.fig と .pen に書き出して。

【タイプ】Mobile App Screen (iOS)

【製品】
- 名前: Plate
- カテゴリ: 食事記録 + 栄養トラッキングアプリ
- ターゲット: 健康志向の 25-35 歳、 ダイエット中ではなく「身体作り」目線
- 主要 KPI: PFC (タンパク質 / 脂質 / 炭水化物) 比率
- 画面 primary purpose: 「今日の食事ログを 3 タップで完了」

【画面構成】iPhone 15 Pro 標準 (375 × 812 px)

【トーン・美学】
- 方向性: warm minimalism、 紙質感のある柔らかな印象
- bg #FFF8F0 (warm cream)、 surface white、 accent #2D5F3F (deep forest green)
- text primary #1A1A1A、 secondary #6B7280、 muted #C7C9CC
- 良い数値 #2D5F3F、 悪い数値 #C44536 (terracotta)
- フォント: heading "DM Sans" Bold / body "Inter" Regular / 数値 "Inter" Bold (mono ではなく数値フォント風)
- card radius 20、 button radius 14、 input radius 12
- subtle shadow (#0000000A、 blur 12、 offset y 2)

【画面 = Home (今日のサマリ)】

縦並び構成 (mobile-app reference の Primary Rule):
1. Status Bar (高さ 62)
2. App Content (Wrapper、 padding 横 20 上 16、 vertical layout、 gap 24)
3. Bottom Tab Bar (Pill 36 radius)

【1. Status Bar (62 px、 transparent bg、 padding 横 24)】
- 左: 時刻 "8:24" (17px SF Pro Bold、 #1A1A1A)
- 右: signal + wifi + battery icon (各 18px)

【2. App Content】

  2.1 Greeting + date (高さ auto、 gap 4)
  - "Good morning, Aoi 🌱" (24px DM Sans Bold #1A1A1A)
  - "Friday, June 9" (13px Inter #6B7280)

  2.2 Today's Macros Card (高さ 196、 bg #2D5F3F (deep green)、 padding 24、 radius 24)
  - top: "Today's plate" (12px white 80% opacity、 letter-spacing 1)
  - 大数値: "1,847" (44px Inter Bold white) + " kcal " (16px white 60%)
  - sub: "of 2,200 goal — 353 left" (13px white 80%)
  - 下部 PFC リング (3 個横並び、 各 56px 円、 stroke 4):
    - P 84g (緑、 progress 70%)
    - F 62g (warm yellow #F5C16C、 progress 85%)
    - C 198g (warm coral #ED8775、 progress 65%)
  - 各リング下に "P 84g" 11px white Bold

  2.3 Quick Add Section (高さ auto)
  - section header: "Quick add" (14px DM Sans Bold) + "View all" (12px accent)
  - 横スクロール 4 card 横並び (gap 12):
    - 各 card 96x120、 bg white、 radius 16、 padding 12
    - 上に emoji 24px (🥗 🍣 ☕ 🥑)
    - 下に料理名 (11px Bold) + kcal (10px secondary)

  2.4 Today's Meals Timeline (gap 12)
  - section header: "Today's meals"
  - 3 meal card (各 横並び、 高さ auto)
    - 左に時刻 (06:45 等、 11px secondary、 mono 風)
    - 右に食事内容 card:
      - bg white、 radius 16、 padding 16
      - 上: 食事名 (14px Bold) + ⋯ menu icon
      - 下: 「418 kcal · P 28g · F 12g · C 48g」(12px secondary)
      - 写真サムネ 48x48 radius 8 左に
  - 最後に「+ Log next meal」ghost button (透明 bg、 dashed border、 padding 14、 radius 14、 center text)

【3. Bottom Tab Bar (公式 mobile-app reference 数値厳守)】
- container 高さ 62 + padding 上 12 横 21 下 21 (home indicator 安全領域)
- Pill (内容物 wrapper): 高さ 62、 width fill_container、 radius 36、 border 1 #E5E7EB 1 透明 (bg white)、 inner padding 4 4
- tab items 5 個 (Today active / Insights / + (FAB) / Recipes / Profile):
  - 各 item: 高さ fill、 radius 26、 layout vertical gap 4、 center
  - icon 18、 label 10px Bold uppercase letter-spacing 0.5
  - active: bg #2D5F3F (solid)、 icon + label white
  - inactive: transparent bg、 icon + label #9CA3AF
- 中央 + FAB は特別: 56x56 円、 bg accent、 icon plus 24 white、 shadow

【公式 mobile-app reference の遵守】
- Status Bar 高さ **62px 必須** (公式値)
- App Content は **1 つの wrapper container** に全要素を入れる (CRITICAL)
- wrapper の padding 横 20、 個別 section は horizontal padding 持たない
- gap で section 区切り、 margin 使わない
- Title font size は全画面で同じ (今回 24px DM Sans Bold で統一)
- Tab Bar pill radius 36、 tab item radius 26、 icon 18、 label 10 厳守

【Anti pattern (絶対ダメ)】
- 競合する複数 hero section
- per-section horizontal padding
- spacer 要素で空間作る (代わりに bottom padding 使う)
- "Anywhere" gradient (今回 minimal 方向なので)

【完了時】
- 全体 PNG (1x + 2x) → /tmp/mealtracker-home.png + .2x.png
- Tab Bar 単独 PNG → /tmp/mt-tabbar.png
- 公式 mobile-app reference の数値 6 件 (62 / 36 / 26 / 18 / 10 / 22-padding) が画像で確認できるか目視
- .fig + .pen 両方
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen
【タイプ】Mobile App Screen (<iOS / Android>)
【製品】<name> ── <カテゴリ>、 ターゲット <X>、 primary purpose "<画面の job>"
【サイズ】iPhone 標準 375 x 812
【トーン】<warm minimalism / brutalist / playful 等>、 bg <#XXX> accent <#YYY>
【フォント】heading <DM Sans Bold> / body <Inter>
【画面構成 (上→下)】Status Bar (62) / Wrapper (padding 20 横、 gap 24) / Bottom Tab Bar (Pill radius 36)
【Wrapper 内 (上→下)】
  - Greeting <名前 + 日付>
  - <Hero card> <内容詳細>
  - <Section X> <内容>
  - <Section Y> <内容>
【Tab Bar】5 tab、 active="<name>"、 各 icon "<lucide name>"、 中央 FAB は <ある / ない>
【数値】公式 spec 厳守 (Status Bar 62 / Pill 36 / Tab item 26 / Icon 18 / Label 10)
【完了時】.fig + .pen + 1x/2x PNG 検証
```
