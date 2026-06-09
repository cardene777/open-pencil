# 11: Fintech Application 全体 (multi-screen)

個人向け資産管理 / 投資 / 家計 / 暗号資産系 fintech アプリの全画面を 1 プロンプトで一括生成。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品】
- 名前と 1 文の説明:
- カテゴリ (投資 / 家計 / 銀行 / 暗号 / 保険 / 税務 etc):
- 対象ユーザー:
- 規制要件 (KYC 必須 / 日本国内 / 国際対応 etc):
- primary actions (1-3 個、 例「入金 / 取引 / 引出 / ポートフォリオリバランス」):

【トーン】(3-5 語、 通常 fintech は信頼感を強調):

【含める画面グループ】(必要なものだけ)
- [ ] Marketing (Landing / Security / Pricing)
- [ ] Auth (Sign up / Sign in / 2FA verify / Password reset)
- [ ] KYC (本人確認、 規制要件があれば)
- [ ] Onboarding (目標設定 / リスクプロファイル / 初回入金 等)
- [ ] Core (主要画面)
- [ ] Settings (Profile / Security / Linked accounts)
- [ ] States (Empty / PendingKYC / Maintenance / Error)
- [ ] Components

【Core 画面】(製品固有、 名前 + 主機能)
- 例 Home (Dashboard) ── 資産サマリと KPI
- 例 Portfolio ── 詳細とアセットアロケーション
- 例 TransactionHistory ── 全件履歴
- 例 GoalDetail ── 目標進捗
- 例 Deposit / Withdraw ── 入出金フロー
```

## Optional

```
【ブランド】
- メインカラー:
- アクセント (positive / negative):

【規制 / 認可】
- 表示すべき規制ロゴ (例「金商法対応」「FCA」「SEC」):
- 必須 disclaimer 文言:

【特有要素】
- 「税金最適化機能含む」
- 「自動リバランス UI 強調」
- 「家族 / カップル shared 機能」
- 「セキュリティ section 強調」

【言語】
- (default 英語、 日本語必須なら明記)
```

## AI が公式 reference から自動補完

- 全画面 4 列グリッド配置 + frame naming
- 全ピクセル数値 (`web-app.md` + `design-system.md` 由来)
- 全コピー文 (form / button / KYC instruction / error message / disclaimer 雛形)
- カラーパレット (信頼感重視で muted、 positive #10B981 系 / negative #EF4444 系)
- typography scale (数値は SF Mono / JetBrains Mono 系)
- KYC フロー (document upload / selfie verify) の standard pattern
- 2FA 画面の OTP input pattern
- Trust signal (encryption / SOC 2 / 規制ロゴ等の表示パターン)
- Loading / Empty / Error / PendingKYC / Maintenance 5 states
- web-app 16 原則 + design-system spacing 全画面適用
- 共通 component 一式

## サンプル

```
/pencil-design

【出力】design/fintech-cashlight.fig + .pen

【製品】
- 名前と 1 文の説明: Cashlight ── 共働きカップル向け資産共有 + 投資自動化
- カテゴリ: 個人投資 + 家計
- 対象ユーザー: 30-40 代の共働き夫婦、 世帯年収 1000-2000 万
- 規制要件: 金商法対応 (KYC + 2FA 必須)、 日本国内のみ
- primary actions: 目標設定 / 入金 / portfolio リバランス

【トーン】
- editorial luxury / 信頼感 / 紙質感

【含める画面グループ】
- [x] Marketing
- [x] Auth
- [x] KYC
- [x] Onboarding
- [x] Core
- [x] Settings
- [x] States
- [x] Components

【Core 画面】
- Home ── 資産 summary + KPI + Goals + Recent activity
- PortfolioDetail ── donut + holdings table + tax-loss harvesting 提案
- TransactionHistory ── filter 付き 全件
- GoalDetail ── 目標進捗 + projection chart + What-if calculator
- Deposit ── 入金フロー (modal)
- Withdraw ── 引出フロー (warning 付き)

【ブランド】
- メインカラー: deep navy
- アクセント: gold

【規制】
- ロゴ: 金商法 + SOC 2 表示
```

## さらに短い指示

```
/pencil-design

design/fintech-cashlight.fig + .pen。
Cashlight ── 共働きカップル向け資産共有 + 投資自動化、 金商法対応 (KYC 必須)、 日本国内。
editorial luxury、 navy + gold、 全画面 (Marketing / Auth / KYC / Onboarding / Core / Settings / States)。
Core は Home / Portfolio / TransactionHistory / GoalDetail / Deposit / Withdraw。
```

## 修正指示

```
KYC を 2 step (document + selfie) から 3 step (+ 住所確認) に
Core に "TaxOptimizer" 画面を 1 つ追加
Sidebar に税理士アサイン機能の入口を
全画面 mobile responsive 版を別 page に
日本語版を別 page に
```

## ヒント

- 規制系 (KYC / 2FA / disclaimer) は AI が標準パターンを補完するので **法的文言だけは Optional で具体的に書く**
- Marketing の Security section は fintech 特有で重視されるので、 含めると trust が伝わる
- 家族 / カップル shared 機能は標準パターンが少ないので **書いた要素のみが反映** される (例「2 人プロフィール card」)
