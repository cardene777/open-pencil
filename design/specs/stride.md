# Stride デザイン仕様書

中小企業 (50-500 名) 向けの統合 HR SaaS。 採用・評価・給与の 3 軸を 1 データモデルで繋ぐ。

## 1. プロダクト概要

- **ビジョン** — 中小企業の HR 業務を、 ツール乱立から解放する
- **ミッション** — 採用・評価・給与の 3 軸を 1 つの employee record で繋ぎ、 HR の業務時間を 1/3 にする
- **解決する課題** — 50-500 名規模の中小企業では、 採用は ATS、 評価は Google Form + Excel、 給与は別 SaaS、 という silo が常態化している。 データ連携が無く、 同じ情報を 3 度入力し、 横断レポートが手動。 HR 担当者の業務時間の 40% 以上が転記・集計・整合性確認に消えている
- **既存代替手段と限界**
  - **SmartHR**: 労務管理に強いが採用・評価は薄い。 別 ATS / 評価ツール併用が前提
  - **BambooHR**: グローバル前提、 日本の社会保険 / 労務規則対応が薄い
  - **Workday**: 大企業向け、 中小には機能過剰 + 価格が壁
  - **個別ツール組合せ (ATS + Form + 給与計算 SaaS)**: silo / 連携無し / 業務手数増
- **製品の差別化価値** — 採用した候補者がそのまま employee record になり、 評価結果が給与改定に直接反映する、 1 データモデル統合の SaaS。 重複入力ゼロ + cross-functional レポート可能

## 2. ユーザーリサーチ

### ペルソナ

#### ペルソナ 1: 田中 美咲 (typical user)
- 役職 / 立場: 中小企業 (従業員 200 名) の人事マネージャー
- 年齢層 / 性別: 40 代女性
- 1 日の流れ: 朝は給与計算の月次締め、 昼は採用面接の調整、 夕方は評価サイクルの進捗確認。 ツール 7 個を切替え、 Excel で集計
- 主要痛み: 「採用した人の情報を 3 つのツールに転記する作業が苦痛」「評価面談の進捗が見えず、 部長クラスから督促が来る」「給与改定時期に評価結果を 1 人ずつ確認する作業に 1 週間かかる」
- 既存代替への満足度: SmartHR + 別 ATS + Google Form + Excel で運用、 ツール間連携無し、 不満度高

#### ペルソナ 2: 佐藤 健一 (power user)
- 役職 / 立場: 同社の経営企画兼 HR 部長
- 年齢層 / 性別: 50 代男性
- 1 日の流れ: 経営会議で人事 KPI 報告、 取締役向け離職率 / 採用進捗 / 給与水準 分析、 田中の運用負荷を見て課題感
- 主要痛み: 「経営報告のためのデータ集計が田中の負担になっている」「事業計画と人事戦略を繋ぐ insight が出せない」「ベンチマーク (業界平均給与等) が無い」
- 既存代替への満足度: 経営判断のために Tableau で BI 構築済だが、 source データの精度が低く信用できない

#### ペルソナ 3: 山田 太郎 (edge case — チームマネージャー)
- 役職 / 立場: エンジニアリングマネージャー (15 名チーム)
- 年齢層 / 性別: 35 歳男性
- 1 日の流れ: 開発業務 8 割、 評価サイクル時期だけ HR 業務、 期初 / 期末に集中
- 主要痛み: 「評価期間中は毎日 1on1 議事録を Notion から Google Form に転記する作業に 30 分」「過去評価が見えず、 評価面談の前準備が大変」
- 既存代替への満足度: Google Form は分かるが UI が業務向きでない、 評価以外で同じツールに来ない

### User Story

- As a HR マネージャー, I want 採用候補者を employee として直接 onboard する, so that 重複入力をゼロにできる
- As a 経営層, I want 採用 / 評価 / 給与 / 離職率 を 1 ダッシュボードで把握する, so that 取締役会で素早く報告できる
- As a チームマネージャー, I want 自部下の評価サイクル進捗を確認 + 1on1 議事録を直接入力する, so that 期末の集計作業が消える
- As a HR マネージャー, I want 評価結果を給与改定に自動反映する, so that 給与改定作業を 1 週間から 1 日に短縮
- As a 経営層, I want 業界 / 規模ベンチマーク と自社を比較, so that 給与改定の妥当性を取締役に説明できる

### Jobs to be Done

- When 採用が決まったとき, I want to 候補者情報を 1 度の入力で employee record にする, so I can ATS から SmartHR への転記作業を消せる
- When 評価サイクルが始まるとき, I want to 全マネージャーに同じ評価フォームを配布 + 進捗トラッキング, so I can 督促作業を自動化できる
- When 給与改定時期が来たとき, I want to 評価結果を昇給テーブルに自動マッピング, so I can 1 人ずつ確認する手作業を消せる
- When 経営会議のとき, I want to 採用 / 離職 / 給与 / 評価 KPI を 1 ダッシュボードで出す, so I can 取締役向け資料作成を 1 時間で完了
- When 法改正があったとき, I want to 影響を受ける従業員を自動抽出, so I can 個別対応漏れを防げる

## 3. 情報設計 (IA)

### サイトマップ

```
Marketing
├── Landing
├── Pricing
└── Sign up CTA
Auth
├── Sign up
├── Sign in
├── Forgot password
└── Email verify
Onboarding
├── Welcome
├── Workspace setup
└── Invite team
Core
├── Home (人事ダッシュボード)
├── Employees (人員一覧)
├── Employee detail
├── Evaluations (評価サイクル管理)
├── Evaluation detail
├── Payroll (給与計算)
├── Recruiting (パイプライン + 候補者)
├── Candidate detail
└── Org chart (組織図)
Settings
├── Profile
├── Workspace
├── Billing
└── Members
States
├── Empty (Employees / Evaluations 等)
├── Loading
├── Error
└── 404
```

### 主要ユーザーフロー

- **新規 HR 担当者の登録 → 初回会社設定**: Sign up → Email verify → Onboarding (Welcome → Workspace setup → Invite team) → Core Home → Employees import (CSV / SmartHR migration)
- **候補者 → 採用 → 雇用 → 評価サイクル**: Recruiting (Candidate add) → Candidate detail (interview log) → Hire button → Employees (auto-create record) → Evaluations (next cycle で自動含む)
- **評価サイクルの開始 → 給与改定**: Evaluations (start cycle) → 各マネージャーが Evaluation detail で記入 → 完了 → Payroll (給与改定 review) → 反映
- **経営報告**: Home (人事ダッシュボード) → KPI 確認 → 詳細 drilldown (Employees / Org chart / Reports)

## 4. 画面一覧

| ID | 画面名 | 役割 | 主要機能 | 主要要素 | 状態 |
|---|---|---|---|---|---|
| M-01 | Landing | LP、 trial 登録誘導 | hero / problem / 3 軸 features / pricing teaser / final CTA | 大型 headline / 製品 mockup / 顧客ロゴ wall / testimonial | -- |
| M-02 | Pricing | 3 tier 提示 | tier card / 詳細比較 table / ROI calculator | toggle (年額 / 月額) / 3 tier card / 24 行 comparison | -- |
| M-03 | Sign up CTA | 単独 trial 登録 page | email form / mockup | split 2 col / form 1 field / 信頼バッジ | -- |
| A-01 | Sign up | 新規アカウント作成 | SSO / form / verify | 中央 card 440 / SSO (Google / Apple / SAML) / form (会社名 / 名前 / email / password) / terms | error |
| A-02 | Sign in | 既存ログイン | SSO / form / forgot | 中央 card / SSO / form / "Forgot password" | error |
| A-03 | Forgot password | リセット link 送信 | email form | 中央 card / 1 field / "Send reset link" | success / error |
| A-04 | Email verify | メール確認待ち | countdown / resend | 中央 card / icon / countdown timer | -- |
| O-01 | Welcome | 新規ユーザー歓迎 | 3 action card | progress 1/3 / 「会社の従業員データを import」「サンプルで触る」「ガイド動画」 | -- |
| O-02 | Workspace setup | 会社基本情報入力 | logo / form | progress 2/3 / 会社名 / 業種 select / 従業員規模 / 給与計算日 / decimal precision | -- |
| O-03 | Invite team | チーム招待 (HR + マネージャー) | email list + role | progress 3/3 / 5 行 email + role (HR Admin / Manager / Employee) | -- |
| C-01 | Home | 人事ダッシュボード | KPI / 進行中タスク / アラート | sidebar / topbar / KPI 6 件 (在籍 / 採用中 / 評価進捗 / 離職率 / 給与確定状況 / 法令注意) / 最近活動 timeline / 自部下進捗 (Manager 時) | empty (社員 0 時) |
| C-02 | Employees | 人員一覧 | table + filter + bulk action | filter chips (部署 / 役職 / 雇用形態 / 在籍状況) / search / table (12 列、 名前 / 役職 / 部署 / 入社日 / 給与帯 / 次回評価 / status) / "Add employee" / CSV export | empty / error |
| C-03 | Employee detail | 個別 employee record | 全 information + 履歴 | 上部 profile card / tab (Profile / Job / Compensation / Evaluations / Documents / Activity log) / 各 tab の form と履歴 | -- |
| C-04 | Evaluations | 評価サイクル管理 | サイクル一覧 + 進捗 | 上部 active cycle card / table (cycle 名 / 開始日 / 終了日 / 対象者数 / 完了数 / status) / "New cycle" / 過去 cycle 履歴 | empty (cycle 0 時) |
| C-05 | Evaluation detail | 評価 form + 結果 | scoring + comment + history | 上部 employee profile mini / cycle info / scoring form (5 段階 + free text) / 過去評価との比較 / 1on1 議事録 (Markdown editor) / status (draft / submitted / approved) | -- |
| C-06 | Payroll | 給与計算 | 月次計算 + review + 改定 | 月選択 toggle / summary card (総支給 / 控除 / 純支給 / 対象人数) / table (employee / 基本給 / 残業 / 諸手当 / 控除 / 振込) / "Confirm payroll" / 評価結果連携した昇給提案 alert | confirmed / draft |
| C-07 | Recruiting | パイプライン + 候補者 | kanban / candidate list | 上部 KPI (open positions / active candidates / time-to-hire 平均) / kanban (応募 / 書類選考 / 一次面接 / 二次面接 / オファー / 内定) / 各 column に候補者 card | empty |
| C-08 | Candidate detail | 候補者個別 | profile + interview log + hire button | 上部 candidate profile / tab (Profile / Interviews / Documents / Evaluations / Notes) / "Hire as employee" CTA (右上 primary) / 面接議事録 timeline | -- |
| C-09 | Org chart | 組織図 | tree visualization | zoom controls / tree view (上から下) / 各 node = avatar + name + role / クリックで Employee detail へ / dept でフィルタ | -- |
| S-01 | Profile | 個人情報編集 | avatar / form | sub-nav (Profile / Workspace / Billing / Members) / avatar 96 / form (name / email disabled / role / timezone / notification preferences) | -- |
| S-02 | Workspace | 会社設定 | identity / labor rules / integrations | logo / 会社名 / 業種 / 従業員規模 / 給与計算日 / 労務規則設定 (週 40h 法定 / 36 協定 / 有休付与ルール) / integrations (会計 SaaS / SSO / Slack) | -- |
| S-03 | Billing | プラン / 使用量 / 支払 | plan card / usage / invoices | current plan (seat 数 + 月額) / usage chart / payment method / invoice table 12 行 + download / tax info | -- |
| S-04 | Members | メンバー / ロール管理 | table + invite | header (members 数 + invite CTA) / filter (Role / Status) / table (avatar / 名前 / email / role / last active / actions) / Pending invitations | empty |
| ST-01 | Empty | 初期状態 (Employees / Evaluations 等) | illustration + CTA | 中央 illustration / title / sub / primary "Import CSV" + secondary "Add manually" | -- |
| ST-02 | Loading | 読み込み | spinner | spinner / "Loading..." / sub "通常 1-2 秒" | -- |
| ST-03 | Error | エラー回復 | error / retry | warning icon / "申し訳ありません" / sub "we have been notified" / primary "Try again" + secondary "Contact support" / error ID mono | -- |
| ST-04 | 404 | 存在しない page | back nav | 大型 "404" / title "ページが見つかりません" / primary "Home へ戻る" | -- |

## 5. デザイン原則

- **トーン** — confident corporate / 親しみやすさ / 信頼感 / efficient
- **想定する印象** — 「重厚な enterprise tool」と「toy」の中間、 BambooHR の human warmth × Workday の data integrity
- **避けたい印象** — Workday のような cold / enterprise-臭、 Notion のような playful / consumer-臭、 SmartHR のような Japanese 役所的画面
- **視覚原則**
  - **density** — medium (data-dense 業務だが breathing room も)
  - **dominant region** — 各画面に 1 つ (Home: KPI 行 / Employees: table / Evaluations: active cycle / Payroll: monthly summary)
  - **hierarchy** — visual weight = 業務重要度 (primary action は右上、 destructive は色で分離)
- **a11y 配慮** — WCAG AA 準拠、 contrast ratio 4.5:1 以上、 focus state 全 interactive element、 keyboard nav 全画面、 screen reader 対応 (給与計算 / 評価 form は labelling 強化)

## 6. ブランド

### カラー

- **メイン** — 信頼感と落ち着き、 BambooHR の green と Workday の blue の中間で「親しみのある business green」を引き出す
- **アクセント** — primary action を目立たせ、 KPI 強調と CTA に使う、 メインカラーから補色側に振った warm yellow 系で human warmth を加える
- **success** — 完了感、 緑系で慣習踏襲、 メインカラーと区別するため shade 深め
- **warning** — 注意喚起 (給与確定前 / 評価未完了 / 法改正影響あり)、 黄系で stop ではなく「確認して」シグナル
- **error** — 明確な問題 (override 必要 / 法令違反検知 / 入力 invalid)、 赤系だが threatening にしないため彩度抑え
- **info** — 補助情報 (tooltip / banner / "did you know?")、 メインカラーと混同しない blue 寄り

### タイポグラフィ

- **heading** — Inter Bold で modern + 高い可読性、 enterprise らしい integrity と consumer らしい friendliness の両立
- **body** — Inter Regular で connected 感、 長文 (評価コメント / 議事録) でも疲れない
- **mono (数値表示)** — JetBrains Mono / SF Mono、 給与・評価点・seat 数・KPI で精度感を演出、 1234.56 と 1234,56 の混乱を防ぐ

## 7. コンポーネント要件 (design system)

| component | variant | 使用意図 |
|---|---|---|
| Button | Primary / Secondary / Outline / Ghost / Destructive (各 sm / md / lg、 default / hover / disabled) | action の hierarchy、 給与確定 / 解雇 / データ削除等の destructive は明確に分離 |
| Input | text / email / password / search / textarea / select / date / number / OTP | form での情報入力、 給与は number、 入社日は date、 評価コメントは textarea で大型 |
| Card | default / interactive / highlighted / featured | content grouping、 KPI card は interactive、 active cycle は featured |
| Badge | default / success / warning / error / info / pro / cycle-status / role | status (雇用形態 / 評価 status / 採用 stage) と role (Admin / Manager / Employee) 表示 |
| Modal | default / fullscreen / sheet | 「給与確定」「評価サイクル開始」のような重要 action / 削除確認 |
| Toast | success / error / info | feedback、 保存 / インポート完了 / エラー、 auto-dismiss |
| Dropdown | menu / select | action menu (3 dots) / 部署選択 / 役職選択 |
| Avatar | 32 / 40 / 56 / 96 + with status dot (在籍 / 休職 / 退職) | 全画面で employee identity |
| Table row | default / hover / selected / muted (退職者) | 大型 data list (Employees / Payroll / Evaluations) |
| Kanban card | default / dragging / selected | Recruiting pipeline で候補者 card |
| Tab | default / active / disabled / count badge | Employee detail / Settings の sub-nav |
| Empty / Loading / Error template | -- | first-class state UI、 各 Core 画面の初期状態 |
| KPI card | default / trend up / trend down / neutral | Home / Payroll の summary、 前期比較 |
| Stepper | horizontal / vertical / with-status | Onboarding 3 step / 評価サイクルの phase |

## 8. 状態の網羅

- **Empty** — 励まし系コピー (「最初の従業員を追加しましょう」「初めての評価サイクルを始めましょう」)、 next action を primary CTA で強く提示、 shame を与えない、 importer ボタンを併設して「CSV からの一括取込」を選びやすく
- **Loading** — reassurance、 spinner + "通常 1-2 秒"、 給与計算など重い処理時は progress bar + "残り N 件" で短いと約束
- **Error** — we 主語 (「申し訳ありません、 サーバーに問題が発生しました」)、 user を blame しない、 "we have been notified" で安心感、 error ID mono で support 問合せを楽に
- **Success** — 祝祭感は控えめ (toast でシンプル) "保存しました" "給与計算を確定しました"、 重要 action (給与確定 / 評価 cycle 完了) はモーダルで明示 + 次の action を提示
- **Permission denied** — Manager が他部署 employee detail へ access した場合等、 "この情報は閲覧権限がありません" + 権限申請への link
- **Maintenance** — 月次の給与計算サーバー reboot 等、 countdown + 影響範囲 (給与 module のみ / 他は使える) を明示

## 9. 制約・要件

- **a11y** — WCAG AA target、 contrast 4.5:1 / focus visible / screen reader / keyboard nav 全画面 (特に給与計算と評価 form)
- **responsive** — desktop (1440+) を主、 tablet (768+) は閲覧中心、 mobile (375+) は通知確認 + 簡単 action のみ
- **platform** — Web only、 mobile 機能は将来検討
- **regulation** — 日本の労働基準法・社会保険法・所得税法・住民税法に対応
  - 週 40h 法定労働時間 / 36 協定の上限管理
  - 有休付与 (法定 + 会社規定)
  - 社会保険料の自動計算 (健康保険 / 厚生年金 / 雇用保険 / 介護保険)
  - 源泉徴収 / 年末調整
  - マイナンバー保管 (暗号化 + アクセスログ)
  - 電子申告 (e-Gov 連携、 オプション)
- **必須 disclaimer** — 「給与計算結果は社労士確認推奨」「労務規則は最新法令ベースですが、 法改正反映には数日かかる場合があります」
- **language** — 日本語 default、 将来 英語版を別 page で追加検討 (グローバル展開時)
- **既存 design system 参照** — 新規作成 (まだ設計予定)、 token 構築から始める

## 10. 次の作業

本仕様書を元にデザインを生成するには:

```
/pencil-design design/specs/stride.md
```

仕様書が SSOT。 修正は本 file を編集して再生成。
