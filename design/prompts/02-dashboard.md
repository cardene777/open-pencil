# 02: Dashboard

管理画面 / 分析ダッシュボード用。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
sidebar 幅 / card padding / KPI fontSize 等は AI が公式 reference から自動補完する。

## プロンプト

~~~text
/pencil-design

[製品]
- 名前: <例 Beacon>
- 1 文の説明: <例 EC ショップ運営者向けリアルタイム計測 SaaS>
- 業種・カテゴリ: <例 SaaS / Analytics>
- このダッシュボードを使う人: <例 月商 500 万〜5000 万のショップ運営者>
- primary purpose (10 秒で把握すること): <例 今日のビジネス状態>

[トーン]
- density: <compact / medium / airy のいずれか>
- 方向性 (3-5 語): <例 信頼感 / data-dense / 落ち着いた>

[主要 KPI (4-6 個、 名前だけ)]
- <例 GMV>
- <例 注文数>
- <例 コンバージョン率>
- <例 平均客単価>

[主要セクション]
- Sidebar nav: <項目をカンマ区切りで列挙、 例 Dashboard, Orders, Customers, Products, Reports, Settings>
- KPI cards: <上の KPI を上部に並べる>
- メインチャート: <種類、 例 売上推移 line chart>
- セカンダリーチャート grid: <種類、 例 上位カテゴリ / 上位商品 / 流入元 / 最近顧客 の 2x2>
- データテーブル: <列名、 例 Order ID / 顧客 / 商品 / ステータス / 金額 / 時間>
- フィルター: <必要なら、 例 日付範囲ピッカー / search>

[ブランド (任意)]
- メインカラー: <例 indigo 系 / 空なら AI が決める>
- positive 色: <例 緑 / 任意>
- negative 色: <例 赤 / 任意>

[既存 design system 参照 (任意)]
- file path: <例 design/dashboard-shop.fig、 既存と統一したい時>

[特有要素 (任意)]
- <例 リアルタイム性を強調 (last sync 表示)>
- <例 export CSV ボタン必須>
- <例 dark mode 想定>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全体 PNG と KPI 列の PNG を /tmp に保存して Read。
- sidebar 幅 / topbar 高 / card padding / spacing / typography は
  ~/.claude/skills/pencil-design/references/web-app.md と
  design-system.md (spacing reference table) に従って AI 補完。
- 公式 web-app 16 原則 (Purpose First / Dominant Region / Action Hierarchy / System Status Visibility) を守って。
- loading / empty / error state も考慮して。
~~~

## 補足

- 修正は自然文: 「KPI を 4 から 6 に増やして」「sidebar をもっとミニマルに」「dark mode 版も別 page に」
- chart の見た目 (色 / 太さ / グリッド) は AI が公式 design-system reference から決める
- AOV / GMV のような業界用語は AI が認識する、 略語のままで OK

## AI が補完する内容

- 全ピクセル数値 (sidebar 240 / topbar 64 / card padding 24 / card radius 12、 公式 reference 由来)
- 全コピー文 (page title / KPI label / placeholder / empty state message)
- カラーパレット展開
- 公式 web-app 16 原則の適用
- レイアウト pattern 選択 (Sidebar+Main / Header+Content / 2 col / Card grid)
- typography scale (eyebrow 11 / label 12 / body 14 / sub 16 / title 24 / KPI 32)
- spacing reference (page 32 / card 24 / form 16 / button [10,16])
- chart のタイプ選択 (line / bar / donut / area)
- loading / empty / error / success の 4 states
