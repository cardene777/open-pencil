# 10: SaaS Application 全体 (multi-screen)

SaaS web アプリの全画面 (Marketing / Auth / Onboarding / Core / Settings / States) を 1 プロンプトで一括生成。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品】
- 名前と 1 文の説明:
- 業種・カテゴリ (SaaS のサブカテゴリ):
- 対象ユーザー:
- 主要 use case (1-2 文):
- 価格モデル (Free / Pro / Team の 3 tier? or 別形式?):

【トーン】(3-5 語):

【含める画面グループ】(必要なものだけチェック)
- [ ] Marketing (Landing / Pricing / Sign up CTA)
- [ ] Auth (Sign up / Sign in / Forgot password / Email verify)
- [ ] Onboarding (Welcome / Setup / Invite)
- [ ] Core (主要画面、 ↓ で詳細)
- [ ] Settings (Profile / Workspace / Billing / Members)
- [ ] States (Empty / Loading / Error / 404)
- [ ] Components (共通 design system)

【Core 画面】(製品固有、 名前 + 主機能を 1-2 文)
- 例 Dashboard ── 一覧サマリと KPI
- 例 List ── 全件閲覧と filter
- 例 Detail ── 個別レコード詳細
- 例 Create / Editor ── 新規作成 / 編集
```

## Optional

```
【ブランド】
- メインカラー:
- アクセント:
- 既存 design system file:

【特有要素】
- 「動画再生機能」「リアルタイム collab」「AI 機能」等
- 「SSO 必須」「KYC 含む」(後者は 11-fintech-app-full の方が向く)
- 「Mobile responsive 必須」「Dark mode 必須」

【言語 / リージョン】
- (default 英語、 日本語 UI なら明記)
```

## AI が公式 reference から自動補完

- 全画面の配置 (4 列グリッド、 x=0/1640/3280/4920、 y は group ごと)
- 全 frame name (`Screen/<group>/<name>` 形式)
- 全ピクセル数値 (`web-app.md` 16 原則 + `design-system.md` spacing table 由来)
- 全コピー文 (各 form field label / button label / placeholder / helper text)
- カラーパレット展開 (success / warning / error / info、 トーンから)
- typography scale 全画面共通
- 共通 component (button 5 variant × 3 sizes / input 8 type / card / badge / modal / toast / avatar / dropdown / table row / empty state)
- placeholder pre-create → 順次中身実装 → placeholder: false 化のフロー
- 各 group ごとの section PNG export + overview PNG 検証
- 25 op cap での batch_design 分割
- 16 原則 (Purpose First / Dominant Region / System Status / Action Hierarchy 等) 全画面適用
- Anti-pattern 回避

## サンプル

```
/pencil-design

【出力】design/saas-lumen.fig + .pen

【製品】
- 名前と 1 文の説明: Lumen ── チーム向け非同期ビデオメッセージング SaaS
- 業種・カテゴリ: コラボレーション SaaS
- 対象ユーザー: 50-500 名規模のリモート企業の PM / Dev / Designer
- 主要 use case: Slack の長文化と Zoom 疲れの中間、 5 分の動画で文脈共有
- 価格モデル: Free (3 video/月) → Pro $12/seat → Team $24/seat (SSO + Analytics 込み)

【トーン】
- friendly minimalism / 余白多い / 顔写真重視

【含める画面グループ】
- [x] Marketing
- [x] Auth
- [x] Onboarding
- [x] Core
- [x] Settings
- [x] States
- [x] Components

【Core 画面】
- Inbox ── 受信動画一覧
- Library (Dashboard) ── 自分のライブラリ + KPI + 最近活動
- ItemList ── 全件 table view (filter + sort)
- ItemDetail ── 動画再生 + コメント + 文字起こし sidebar
- ItemCreate ── 録画フロー (source 選択 → 録画 → 設定 → 送信)

【ブランド】
- メインカラー: violet 系
- アクセント: warm yellow (highlight)
```

## さらに短い指示

```
/pencil-design

design/saas-lumen.fig + .pen。
Lumen ── チーム向け非同期ビデオ SaaS。 50-500 人リモート企業向け、 5 分動画で文脈共有。
violet + warm yellow、 friendly minimalism。
Marketing / Auth / Onboarding / Core / Settings / States 全部、 全 22 画面前後。
Core は Inbox / Library / List / Detail / Create の 5 画面。
価格は Free / Pro $12 / Team $24 の 3 tier。
```

## 修正指示

```
Auth に SSO 設定画面を追加
Core の Library を grid view と list view 切替可能に
Settings に Integrations tab 追加 (Slack / Notion / Linear)
全画面 Mobile responsive 版を別 page に
全画面 Dark mode 版も別 page に
```

## ヒント

- 画面数が多いので時間がかかる。 「Marketing と Auth だけ先に」のように **group 単位で分割実行** も可能
- 後から「Core の Detail だけ作り直して」のように **group 部分修正** もできる
- 既存 design system がある場合、 Optional に file path を書くと token を流用してくれる
