# 11: Fintech Application 全体 (multi-screen)

個人向け資産管理 / 投資 / 家計 / 暗号資産系 fintech アプリの全画面を 1 プロンプトで生成。 KYC / 2FA / 規制ロゴ等の fintech 固有要素も含む。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
信頼感を強調したカラーパレット / 規制 disclaimer 雛形 / KYC フロー / 2FA OTP 画面の標準パターンは AI が公式 reference から自動補完。

## プロンプト

~~~text
/pencil-design

[製品]
- 名前: <例 Cashlight>
- 1 文の説明: <例 共働きカップル向け資産共有 + 投資自動化>
- カテゴリ: <例 個人投資 + 家計 / 銀行 / 暗号 / 保険 / 税務>
- 対象ユーザー: <例 30-40 代の共働き夫婦、 世帯年収 1000-2000 万>
- 規制要件: <例 金商法対応 (KYC + 2FA 必須)、 日本国内のみ / FCA / SEC / 規制なし>
- primary actions (1-3 個): <例 目標設定 / 入金 / portfolio リバランス>

[トーン (3-5 語、 通常 fintech は信頼感を強調)]
- <例 editorial luxury / 信頼感 / 紙質感>

[含める画面グループ]
- Marketing (Landing / Security / Pricing)
- Auth (Sign up / Sign in / 2FA verify / Password reset)
- KYC (本人確認、 規制要件があれば、 例 document upload / selfie verify)
- Onboarding (目標設定 / リスクプロファイル / 初回入金)
- Core (主要画面、 ↓ で詳細列挙)
- Settings (Profile / Security / Linked accounts)
- States (Empty / PendingKYC / Maintenance / Error)
- Components

(↑ 不要な group は削除)

[Core 画面 (製品固有、 名前 + 主機能 1-2 文)]
- <例 Home ── 資産サマリと KPI + Goals + Recent activity>
- <例 PortfolioDetail ── donut + holdings table + tax-loss harvesting 提案>
- <例 TransactionHistory ── filter 付き 全件>
- <例 GoalDetail ── 目標進捗 + projection chart + What-if calculator>
- <例 Deposit / Withdraw ── 入出金フロー (modal)>

[ブランド (任意)]
- メインカラー: <例 deep navy / 任意>
- アクセント: <例 gold / 任意>

[規制 / 認可 (任意、 fintech では推奨)]
- 表示すべき規制ロゴ: <例 金商法 / SOC 2 / FCA / SEC / GDPR>
- 必須 disclaimer 文言: <例 「過去の運用実績は将来の成果を保証しません」>

[特有要素 (任意)]
- <例 税金最適化機能含む>
- <例 自動リバランス UI 強調>
- <例 家族 / カップル shared 機能>
- <例 Dark mode 必須>

[言語]
- <default 英語、 日本語必須なら明記>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全画面の overview PNG (scale 0.4) と group ごと PNG を /tmp に保存して Read。
- 4 列グリッド配置 (x=0/1640/3280/4920、 y は group ごと 1000)、 全 frame は Screen/<group>/<name>。
- 全ピクセル数値 / 全コピー文 / カラーパレット / typography / 共通 component は
  ~/.claude/skills/pencil-design/references/ の web-app.md と design-system.md と landing-page.md に従って AI 補完。
- KYC フロー (document upload / selfie verify) と 2FA OTP 画面は標準パターンで補完。
- Trust signal (encryption / SOC 2 / 規制ロゴ表示) は Marketing/Security と Auth 画面に組み込み。
- 信頼感重視で muted カラー、 positive #10B981 系 / negative #EF4444 系 を AI が選定。
- 数値表示 (金額・ %) は SF Mono / JetBrains Mono 系で。
~~~

## 補足

- 修正は自然文: 「KYC を 2 step から 3 step (+ 住所確認) に」「Core に TaxOptimizer 画面追加」「Sidebar に税理士アサイン機能の入口を」「全画面 mobile responsive 版を別 page に」「日本語版を別 page に」
- 規制系 (KYC / 2FA / disclaimer) は AI が標準パターンを補完するので、 法的文言だけ Optional に書けば十分
- 家族 / カップル shared 機能は標準パターンが少ないので、 書いた要素のみが反映される (例「2 人プロフィール card」)

## AI が補完する内容

- 全画面 4 列グリッド配置 + frame naming
- 全ピクセル数値 (web-app + design-system 由来)
- 全コピー文 (form / button / KYC instruction / error message / disclaimer 雛形)
- カラーパレット (信頼感重視で muted、 positive #10B981 系 / negative #EF4444 系)
- typography scale (数値は SF Mono / JetBrains Mono)
- KYC フロー (document upload / selfie verify) standard pattern
- 2FA 画面の OTP input pattern
- Trust signal (encryption / SOC 2 / 規制ロゴ等の表示パターン)
- Loading / Empty / Error / PendingKYC / Maintenance の 5 states
- web-app 16 原則 + design-system spacing 全画面適用
- 共通 component 一式
