# 05: Settings 画面

アプリ内設定 / プロフィール / アカウント管理画面用。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品】
- 名前と 1 文の説明:
- 業種・カテゴリ:
- 既存 dashboard / app と同じ design system か (Yes / No):

【画面の種類】(必要なものだけ列挙、 1 file に複数 tab でも可)
- Profile (個人情報)
- Account (環境設定)
- Security (パスワード / 2FA / セッション / API)
- Notifications (通知設定)
- Billing (請求 / プラン)
- Members / Team (組織管理)
- Integrations (外部連携)
- Danger Zone (アカウント削除等、 必要なら)

【含めたい要素】(画面ごとに、 名前だけ)
- 例 Profile: 名前 / email / アバター / bio / 役職 / タイムゾーン
- 例 Security: パスワード変更 / 2FA / アクティブ session / API token
```

## Optional

```
【ブランド】
- 既存 dashboard と統一 (同じカラー / radius / spacing):
- メインカラー (新規時のみ):

【特有要素】
- 「企業向けで SAML SSO 設定必須」
- 「Danger zone は別 tab に隔離」
- 「Team 招待は招待リンク方式」等
```

## AI が公式 reference から自動補完

- spacing reference table (form gap 16 / card padding 24 / button group gap 12、 `design-system.md` 由来)
- button hierarchy (primary Save / secondary Cancel / destructive Delete account)
- card slot composition (header / content / actions slots)
- form layout (1 col / 2 col 横並びの使い分け)
- input + label + helper text の高さ統一
- radio / checkbox / toggle / select の使い分け
- danger zone の border / bg / 色 (red 系)
- success / error state messaging
- 全コピー文 (Save / Cancel / Last changed N days ago / N devices signed in 等)
- accessibility 配慮 (label 必須 / focus state / contrast)

## サンプル

```
/pencil-design

【出力】design/settings-beacon.fig + .pen

【製品】
- 名前と 1 文の説明: Beacon ── EC 運営者向け Analytics SaaS
- 業種・カテゴリ: SaaS / Analytics
- 既存 dashboard と同じ design system か: Yes (design/dashboard-shop.fig を参照)

【画面の種類】
- Profile
- Account
- Security
- Notifications
- Billing
- Members

【含めたい要素】
- Profile: アバター / 名前 / email / username / 役職 / bio / タイムゾーン / 言語
- Account: 表示言語 / 日付形式 / 通貨 / theme (light/dark/system)
- Security: パスワード変更 / 2FA (TOTP) / アクティブ session 一覧 / API token 管理
- Notifications: メール通知 ON/OFF (種類別)
- Billing: 現プラン / 使用量 / カード / 請求書履歴
- Members: メンバー一覧 / 招待 / ロール / 保留中招待

【ブランド】
- 既存 dashboard と統一 (indigo + 黒文字)
```

## さらに短い指示

```
/pencil-design

design/settings-beacon.fig + .pen。
Beacon Analytics の設定画面、 既存 dashboard と同じ design system。
tab で Profile / Account / Security / Notifications / Billing / Members の 6 画面。
Save changes は右上 primary、 Danger zone は Account tab 内に隔離。
```

## 修正指示

```
Security tab に backup code セクション追加
Billing の請求書履歴を 6 行から 12 行に
Members tab の招待 UI を email 直接打ち込みに、 招待リンクと併用
Notifications を toggle ベースから checkbox ベースに変更
```
