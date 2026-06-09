# 02: Dashboard プロンプトテンプレ

管理画面 / 分析ダッシュボード / SaaS 内部画面用。

## 最強サンプル (細かい指示の見本)

```
/pencil-design

design/dashboard-analytics.fig と design/dashboard-analytics.pen に書き出して。

【タイプ】Web App Dashboard (analytics 系)

【製品】
- 名前: Beacon Analytics
- カテゴリ: ECサイト運営者向けリアルタイム計測 SaaS
- ターゲット: 月商 500 万〜5000 万円規模のショップ運営者
- 主要 KPI: GMV / Orders / Conversion Rate / AOV
- このページの primary purpose: 「今日のビジネス状態を 10 秒で把握する」(公式 web-app 原則 #1 Purpose First)

【トーン・美学】
- 方向性: data-dense + 高情報密度、 ただし overwhelm しない (公式 #9 Density Intentionality: Medium)
- カラー: bg #FAFBFD (slate-50) / surface white / accent #4F46E5 (indigo-600)
- text: primary #1A1F36 / secondary #4B5563 / tertiary #9CA3AF
- positive #10B981 (emerald-500) / negative #EF4444 (red-500) / warning #F59E0B
- フォント: Inter (display + body)、 数値は SF Mono (mono fontFamily)
- card に subtle 影 (shadow blur 16 offset y 2 #0000000A)
- spacing scale: 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64

【画面サイズ】1440 × 900 (デスクトップ標準、 fit_content 縦)

【レイアウト (Pattern A: Sidebar + Content)】
┌──────────┬─────────────────────────────────────────┐
│ Sidebar  │ TopBar (64)                             │
│ 240 px   ├─────────────────────────────────────────┤
│          │ Page Header + Date Range                │
│          │                                         │
│          │ KPI Cards Row (4 cards)                 │
│          │                                         │
│          │ Main Chart (large)                      │
│          │                                         │
│          │ Secondary Grid (2x2 chart)              │
│          │                                         │
│          │ Recent Orders Table                     │
└──────────┴─────────────────────────────────────────┘

【セクション詳細】

1. Sidebar (幅 240、 bg #0F172A (slate-900)、 padding 上下 24 横 16、 gap 4)
   - 上部 logo "Beacon" (font Inter Bold 18、 white)
   - section label "MAIN" (11px、 letter-spacing 2、 #64748B、 uppercase、 padding 上下 8)
   - nav items 5 個 (各 高さ 40、 padding 横 12、 radius 8、 hover bg #1E293B):
     - Dashboard (active、 bg #4F46E5、 icon "layout-dashboard"、 14px white Bold)
     - Orders (icon "shopping-bag"、 right に badge "12")
     - Customers (icon "users")
     - Products (icon "package")
     - Reports (icon "bar-chart")
   - section "ANALYZE":
     - Real-time (icon "activity")
     - Funnels (icon "git-branch")
     - Cohorts (icon "layers")
   - section "ADMIN":
     - Settings (icon "settings")
     - Team (icon "users-2")
   - 下部 user profile card (avatar 32 円 + name + role、 bg #1E293B、 radius 8)

2. TopBar (高さ 64、 bg white、 border-bottom 1 #E5E7EB、 padding 横 32)
   - 左: breadcrumb "Dashboard / Today" (13px #4B5563)
   - 中央: 検索ボックス (radius 8、 padding 8 12、 bg #F3F4F6、 placeholder "Search orders, customers...")
   - 右: notification bell + help icon + avatar (各 32x32 radius 8 透明背景)

3. Page Header (padding 横 32 上 32 下 24、 height 64)
   - 左: title "Dashboard" (24px Inter Bold) + sub "Real-time business pulse" (14px secondary)
   - 右: date range picker (filled、 padding 8 16、 radius 8、 bg white border #E5E7EB)
     - "Today" (current) + chevron down
   - 横並び 2 ボタン:
     - secondary "Export" (outline、 icon "download")
     - primary "New campaign" (filled #4F46E5、 white、 icon "plus")

4. KPI Cards Row (4 card 横並び、 gap 16、 padding 横 32)
   - 各 card: 高さ 132、 padding 24、 bg white、 radius 12、 border 1 #E5E7EB
   - 構造:
     - 上段: label (12px Bold uppercase #6B7280) + icon (16 secondary)
     - メイン値: 32px SF Mono Bold #1A1F36
     - 下段: 前期比較 (▲ / ▼ + 8 px gap)
   - 4 件:
     - GMV: 「¥4,287,500」/「▲ 12.4% vs yesterday」(green)
     - Orders: 「342」/「▲ 8.1%」(green)
     - Conversion: 「3.42%」/「▼ 0.2%」(red)
     - AOV: 「¥12,536」/「▲ 4.0%」(green)

5. Main Chart (高さ 360、 bg white、 radius 12、 border、 padding 24、 margin 上 24)
   - header: "Revenue trend" (16px Bold) + 右に tab "GMV" / "Orders" / "Customers"
   - chart 領域: line chart placeholder (240 高)、 線 #4F46E5 + #10B981、 軸 #E5E7EB
   - hover tooltip (placeholder で 1 つ表示): "12:00 PM ¥327,500" white bg shadow

6. Secondary Grid (2x2 chart card、 各 280 高、 gap 16)
   - Top Categories: horizontal bar chart (5 行)
   - Top Products: list (placeholder 5 row、 各 thumbnail 40 + title + 売上)
   - Traffic Source: donut chart 4 分割 (Direct / Social / Email / Ads)
   - Recent Customers: avatar grid 8 名 (32 円)

7. Recent Orders Table (margin 上 24、 bg white、 radius 12、 border)
   - header bar: title "Recent orders" + "View all" link + search small input
   - table 8 行、 列: Order ID (mono) / Customer / Product / Status (badge) / Total (mono) / Time (mono)
   - status badge: paid (green) / pending (yellow) / refunded (red)
   - row hover bg #F9FAFB

【公式 16 原則の遵守 (web-app reference)】
- #1 Purpose First → 「今日の状態を 10 秒で把握」を Dominant
- #2 Dominant Region → KPI Cards Row が最も visual weight 高い
- #6 System Status Visibility → 全 chart に loading / empty 状態を想定 (今回 placeholder で可)
- #7 Action Hierarchy → primary action は「New campaign」のみ、 残りは secondary
- #9 Density: Medium (compact ではない、 enterprise dashboard なのでバランス)
- #11 Feedback → button hover state を想定 (今回静的でも color shift 描画)
- #13 Entity Integrity → table row が customer/product/status を全部出す

【数値仕様 (絶対遵守)】
- sidebar 幅 240
- topbar 高さ 64
- page padding 横 32
- card radius 12 / padding 24
- card gap 16
- section gap 24
- font sizes: 11 (eyebrow) / 12 (label) / 13 (caption) / 14 (body) / 16 (subheading) / 24 (page title) / 32 (kpi value)
- icon sizes: 14 (inline) / 16 (button) / 20 (nav)

【完了時】
- 全体 PNG export → /tmp/dashboard-analytics.png
- KPI card 列だけ PNG → /tmp/da-kpi.png
- main chart だけ PNG → /tmp/da-chart.png
- Read で目視確認 (3 回まで修正)
- .fig + .pen 両方ファイル化して報告
```

## 短縮版

```
/pencil-design

【出力】design/<name>.fig + .pen
【タイプ】Web App Dashboard (<analytics / admin / CRM / SaaS 等>)
【製品】<name> ── <カテゴリ>、 ターゲット <X>、 primary purpose "<10 秒で何を把握>"
【トーン】<data-dense Medium / Compact / Airy>、 bg <#XXX>、 accent <#YYY>、 positive <#10B981>、 negative <#EF4444>
【フォント】Inter (body) / SF Mono (数値)
【レイアウト】Pattern A (Sidebar 240 + Main) または Pattern B (TopBar 64 + Content)
【sidebar】<section 名 + nav item list、 各 icon 名>
【topbar】<内容: breadcrumb / search / actions>
【page header】<title + sub + date range + action 2 つ>
【KPI 行】<4 件 KPI 名と値の placeholder>
【chart】<main chart 種類 + secondary grid 2x2>
【table】<列名一覧、 行数>
【数値】sidebar 240 / topbar 64 / card radius 12 padding 24 / gap 16-24
【完了時】.fig + .pen + section PNG 検証
```
