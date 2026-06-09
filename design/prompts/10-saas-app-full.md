# 10: SaaS Application 全体 (multi-screen)

SaaS web アプリの Marketing / Auth / Onboarding / Core / Settings / States を 1 プロンプトで一括生成。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
4 列グリッドの配置 / 全ピクセル数値 / 全コピー文 / 共通 component は AI が公式 reference から自動補完。

## プロンプト

~~~text
/pencil-design

[製品]
- 名前: <例 Lumen>
- 1 文の説明: <例 チーム向け非同期ビデオメッセージング SaaS>
- 業種・カテゴリ: <例 コラボレーション SaaS>
- 対象ユーザー: <例 50-500 名規模のリモート企業の PM / Dev / Designer>
- 主要 use case (1-2 文): <例 Slack の長文化と Zoom 疲れの中間、 5 分動画で文脈共有>
- 価格モデル: <例 Free (3 video/月) / Pro $12/seat / Team $24/seat (SSO + Analytics)>

[トーン (3-5 語)]
- <例 friendly minimalism / 余白多い / 顔写真重視>

[含める画面グループ]
- Marketing (Landing / Pricing / Sign up CTA)
- Auth (Sign up / Sign in / Forgot password / Email verify)
- Onboarding (Welcome / Setup / Invite team)
- Core (主要画面、 ↓ で詳細列挙)
- Settings (Profile / Workspace / Billing / Members)
- States (Empty / Loading / Error / 404)
- Components (共通 design system)

(↑ 不要な group は削除して OK)

[Core 画面 (製品固有、 名前 + 主機能を 1-2 文ずつ)]
- <例 Inbox ── 受信動画一覧>
- <例 Library ── 自分のライブラリ + KPI + 最近活動>
- <例 ItemList ── 全件 table view (filter + sort)>
- <例 ItemDetail ── 動画再生 + コメント + 文字起こし sidebar>
- <例 ItemCreate ── 録画フロー (source 選択 → 録画 → 設定 → 送信)>

[ブランド (任意)]
- メインカラー: <例 violet 系 / 任意>
- アクセント: <例 warm yellow (highlight) / 任意>
- 既存 design system file: <任意、 token 流用したい時>

[特有要素 (任意)]
- <例 動画再生機能>
- <例 リアルタイム collab>
- <例 SSO 必須>
- <例 Mobile responsive 版も別 page に>
- <例 Dark mode 版も別 page に>

[言語]
- <default 英語、 日本語 UI なら明記>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全画面の overview PNG (scale 0.4) と group ごと PNG と Components PNG を /tmp に保存して Read。
- 4 列グリッド配置 (x=0/1640/3280/4920、 y は group ごと 1000) で配置、
  全 frame name は Screen/<group>/<name> 形式に。
- 全ピクセル数値 (sidebar 240 / topbar 64 / card padding 24 等) / 全コピー文 / 共通 component は
  ~/.claude/skills/pencil-design/references/ の web-app.md (16 原則) と
  design-system.md (spacing table / button hierarchy) と
  landing-page.md (Marketing group) に従って AI 補完。
- 各画面 placeholder: true で先に pre-create、 完成時 false に。
- 1 batch 25 op cap で section ごとに実装。
~~~

## 補足

- 修正は自然文: 「Auth に SSO 設定画面追加」「Core の Library を grid / list 切替可能に」「Settings に Integrations tab 追加 (Slack / Notion / Linear)」「全画面 Mobile responsive 版を別 page に」
- 画面数が多いので時間がかかる。 「Marketing と Auth だけ先に」のように group 単位で分割実行も可能
- 後から「Core の Detail だけ作り直して」のように group 部分修正もできる

## AI が補完する内容

- 全画面の配置 (4 列グリッド、 x=0/1640/3280/4920、 y は group ごと)
- 全 frame name (`Screen/<group>/<name>` 形式)
- 全ピクセル数値 (sidebar 240 / topbar 64 / card padding 24、 公式 reference 由来)
- 全コピー文 (form label / button label / placeholder / helper text)
- カラーパレット展開 (success / warning / error / info)
- typography scale 全画面共通
- 共通 component (button 5 variant × 3 sizes / input 8 type / card / badge / modal / toast / avatar / dropdown / table row / empty state)
- placeholder pre-create → 順次中身実装 → placeholder: false 化のフロー
- 16 原則 (Purpose First / Dominant Region / System Status / Action Hierarchy 等) 全画面適用
- Anti-pattern 回避 (flat bg / per-section padding / 競合 focal point)
