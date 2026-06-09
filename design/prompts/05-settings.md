# 05: Settings 画面

アプリ内設定 / プロフィール / アカウント管理画面用。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
form の spacing / button hierarchy / Danger zone のカラーは AI が公式 design-system reference から自動適用。

## プロンプト

~~~text
/pencil-design

[製品]
- 名前: <例 Beacon>
- 1 文の説明: <例 EC 運営者向け Analytics SaaS>
- 業種・カテゴリ: <例 SaaS / Analytics>
- 既存 dashboard / app と同じ design system か: <Yes (参照 file path) / No>

[画面の種類 (必要なものだけ、 1 file に複数 tab で OK)]
- Profile (個人情報)
- Account (環境設定 / 言語 / theme)
- Security (パスワード / 2FA / アクティブ session / API token)
- Notifications (通知種類別 ON/OFF)
- Billing (プラン / 使用量 / カード / 請求書)
- Members / Team (招待 / ロール / 保留中)
- Integrations (外部連携)
- Danger Zone (アカウント削除 / データ export)

[各画面に含めたい要素 (画面ごとに、 名前だけで OK)]
- Profile: <例 アバター / 名前 / email / username / bio / 役職 / タイムゾーン / 言語>
- Account: <例 表示言語 / 日付形式 / 通貨 / theme (light/dark/system)>
- Security: <例 パスワード変更 / 2FA TOTP / アクティブ session 一覧 / API token 管理>
- Notifications: <例 メール通知 (種類別) / プッシュ通知>
- Billing: <例 現プラン / 使用量 / カード ****1234 / 請求書履歴>
- Members: <例 メンバー一覧 / 招待 / ロール / 保留中招待>

[ブランド (任意)]
- 既存 dashboard と統一: <Yes (同じカラー / radius / spacing) / 新規>
- メインカラー: <例 indigo 系 / 新規時のみ>

[特有要素 (任意)]
- <例 企業向けで SAML SSO 設定必須>
- <例 Danger zone は Account tab 内に隔離>
- <例 Team 招待は招待リンク方式>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全体 PNG と Danger Zone 単独 PNG を /tmp に保存して Read。
- form gap / card padding / button hierarchy / Danger zone カラーは
  ~/.claude/skills/pencil-design/references/design-system.md と
  web-app.md (16 原則) に従って AI 補完。
- Save changes は右上 primary、 Cancel は outline secondary、 Delete は destructive red。
- "Last changed N days ago" "N devices signed in" のような System Status Visibility を入れて。
~~~

## 補足

- 修正は自然文: 「Security tab に backup code セクション追加」「Notifications を toggle ベースから checkbox に」「Members tab の招待 UI を email 直接打ち込み式に」
- 既存 dashboard と統一したい時は `[既存 design system] file path` を必ず書く (token 流用される)
- 1 画面のみ作るなら本テンプレ、 アプリ全体の Settings 群を作るなら 10/11/12/13/14 の `*-full.md` の Settings group を使う

## AI が補完する内容

- spacing reference table (form gap 16 / card padding 24 / button group gap 12)
- button hierarchy (primary Save / secondary Cancel / outline Tertiary / destructive Delete)
- card slot composition (header / content / actions の 3 slot)
- form layout (1 col / 2 col 横並びの使い分け)
- input + label + helper text 高さ統一
- radio / checkbox / toggle / select の使い分け
- danger zone の border / bg / 色 (red 系統一)
- success / error state messaging
- 全コピー文 (Save / Cancel / "Last changed N days ago" / "N devices signed in" 等)
- accessibility 配慮 (label 必須 / focus state / contrast)
