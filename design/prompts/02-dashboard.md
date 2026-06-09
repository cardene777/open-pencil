# 02: Dashboard

管理画面 / 分析ダッシュボード用。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品】
- 名前と 1 文の説明:
- 業種・カテゴリ:
- このダッシュボードを使う人 (1 文):
- primary purpose (この画面で何を 10 秒で把握するか):

【トーン】
- density (compact / medium / airy のいずれか):
- 方向性 (3-5 語):

【主要 KPI】(4-6 個、 名前だけで OK)
- 例: 売上 / 注文数 / コンバージョン率 / 客単価

【主要セクション】(必要なものだけ)
- Sidebar nav (項目名のリスト)
- KPI cards (上の KPI を並べる)
- メインチャート (種類、 例「売上推移」)
- セカンダリーチャート grid (任意、 種類)
- データテーブル (任意、 列名)
- フィルター / 検索の要否
```

## Optional (書きたければ)

```
【ブランド】
- メインカラー:
- アクセント (positive 系 / negative 系):

【既存 design system】
- 参照する .fig / .pen file path (token 流用):

【機能制約】
- 「リアルタイム性を強調したい」
- 「export ボタン必須」
- 「dark mode 想定」等
```

## AI が公式 reference から自動補完

- 全ピクセル数値 (sidebar 240 / topbar 64 / card padding 24、 `web-app.md` + `design-system.md` 由来)
- 全コピー文 (page title / KPI label / placeholder text)
- カラーパレット (トーンと density から)
- 公式 web-app 16 原則の適用 (Purpose First / Dominant Region / Action Hierarchy / Density Intentionality)
- レイアウト pattern 選択 (Pattern A Sidebar+Main / Pattern B Header+Content / Pattern C 2 col / Pattern D Card grid)
- Typography scale (eyebrow 11 / label 12 / body 14 / sub 16 / title 24 / KPI 32 等)
- spacing reference (page 32 / card 24 / form 16 / button [10,16])
- empty / loading / error 状態の考慮
- chart のタイプ選択 (line / bar / donut / area の使い分け)

## サンプル

```
/pencil-design

【出力】design/dashboard-shop.fig + .pen

【製品】
- 名前と 1 文の説明: Beacon ── EC ショップ運営者向けリアルタイム計測 SaaS
- 業種・カテゴリ: SaaS / Analytics
- このダッシュボードを使う人: 月商 500 万〜5000 万のショップ運営者
- primary purpose: 今日のビジネス状態を 10 秒で把握する

【トーン】
- density: medium
- 方向性: 信頼感 / data-dense / 落ち着いた

【主要 KPI】
- GMV (売上)
- 注文数
- コンバージョン率
- 平均客単価

【主要セクション】
- Sidebar nav: Dashboard / Orders / Customers / Products / Reports / Settings
- KPI cards (上 4 件横並び)
- メインチャート: 売上推移 line chart
- セカンダリーチャート grid: 上位カテゴリ / 上位商品 / 流入元 / 最近顧客
- データテーブル: 最近の注文 (Order ID / 顧客名 / 商品 / ステータス / 金額 / 時間)
- フィルター: 日付範囲ピッカー必須

【ブランド】
- メインカラー: indigo 系
- positive: 緑 / negative: 赤
```

## さらに短い指示

```
/pencil-design

design/dashboard-shop.fig + .pen で。
Beacon ── EC ショップ運営者向けリアルタイム計測 SaaS。
中規模ショップ運営者が今日の状態を 10 秒で把握する画面。
medium density、 indigo 系、 sidebar + main pattern。
KPI 4 件 (GMV / 注文数 / CV / AOV)、 メイン chart に売上推移、
下に 4 つのサブ chart、 最後に最近の注文 table。
```

## 修正指示

```
KPI を 4 から 6 に増やして (返品率と LTV を追加)
sidebar に "Reports" 配下のサブメニューを展開した形にして
Density を airy に
ダーク mode 版も別 page に追加
```
