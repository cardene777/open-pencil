# pencil-design プロンプト集

`/pencil-design` skill を使ってデザインを生成するための **プロンプトテンプレ集**。

## 使い方 (3 ステップ)

1. **テンプレを開く**: 下の表から用途に合う file を開く (例: `01-landing-page.md`)
2. **プロンプトをコピー**: 「プロンプト」セクションの ~~~ で囲まれた部分を丸ごとコピー
3. **`<...>` を書き換えて貼る**: terminal の claude code に貼り付けて Enter

`<...>` は埋める枠です。 ピクセル数値・hex color・全コピー文・spacing は AI が公式 reference から自動補完するので書く必要はありません。

## テンプレ

### 単発画面 (1 画面 / 1 deck)

| ファイル | 用途 |
|---|---|
| `01-landing-page.md` | マーケティング LP / プロダクト紹介ページ |
| `02-dashboard.md` | 管理画面 / 分析ダッシュボード |
| `03-mobile-app.md` | iOS / Android app 1 画面 |
| `04-slides.md` | プレゼン資料 (1920x1080) |
| `05-settings.md` | アプリ内設定画面 |

### アプリケーション全体 (multi-screen、 1 プロンプトで 8-24 画面)

| ファイル | 用途 | 画面数 |
|---|---|---|
| `10-saas-app-full.md` | SaaS web アプリ全体 (Marketing + Auth + Onboarding + Core + Settings + States + Components) | 12-22 |
| `11-fintech-app-full.md` | Fintech アプリ全体 (Marketing + Auth + KYC + Onboarding + Core + Settings + States) | 14-24 |
| `12-ecommerce-app-full.md` | E-commerce 全体 (Storefront + Cart + Account + Admin + States) | 12-20 |
| `13-mobile-app-full.md` | Mobile app 全体 (Onboarding + Auth + Core + Create + Settings) | 10-18 |
| `14-marketing-site-full.md` | Corporate / Marketing site 全体 (Home + Product + Pricing + About + Blog + Docs + Conversion) | 8-12 |

## 各テンプレの構造

| section | 内容 |
|---|---|
| 使い方 | 1 行の概要 |
| プロンプト | コピー用の 1 本プロンプト、 `<...>` で埋める枠を明示 |
| 補足 | 修正指示の出し方 / 短いヒント |
| AI が補完する内容 | ユーザーが書かなくても AI が公式 reference から決める項目のリスト |

## 設計思想

ユーザーは **What** (何を / 誰のために / どんな機能) を書き、 AI は **How** (px / hex / コピー文 / レイアウト) を `~/.claude/skills/pencil-design/references/` から自動補完します。

```
ユーザーが書く                  AI が補完
─────────────────              ────────────────────
- 製品名 + 1 文                - 全ピクセル数値
- 業種                         - カラーパレット
- 対象ユーザー                 - 全コピー文
- トーン (3-5 語)              - typography scale
- 必要画面リスト               - spacing / radius
- (任意) ブランドカラー        - icon 選択
- (任意) 特有要素              - layout pattern
                                - 共通 component
```

ピクセル数値や hex color、 コピー文の細部までユーザーが書く必要はありません。 「ミニマル / ダーク / アクセント緑」 のような **方向性だけ伝えれば AI が補完** します。

## skill 呼び出し

```
/pencil-design <プロンプト本文>
```

明示 slash command で skill を強制起動。 自然文 (「LP 作って」等) でも description trigger で発動するが、 確実にしたいなら slash 形式推奨。

## 修正指示の出し方 (生成後)

```
Hero の見出しもっと大きく
Pricing を 3 tier から 2 tier に
Footer 暗くしすぎ、 トーン落として
全画面 mobile responsive 版を別 page に追加
dark mode 版も別 page に
```

数値や hex を書かず、 「対象 + 方向性」だけで指示する。

## skill が参照する公式 reference (補完元 SSOT)

| reference | 補完される内容 |
|---|---|
| `landing-page.md` | LP 構成・Hero rule・Anti-Slop・Imagery hierarchy |
| `web-app.md` | 16 原則 (Purpose First / Hierarchy / Action Hierarchy 等) |
| `mobile-app.md` | Status Bar 62px / Tab Bar 36 等の数値 spec |
| `slides.md` | typography scale / layout-01〜06 |
| `design-system.md` | spacing table / button hierarchy / token / slot composition |
| `figma-plugin-api-quirks.md` | inkly CLI 実装時の罠回避 (textAutoResize / sizingMode 等) |
| `inkly-cli-cookbook.md` | bun + CLI 使い方 + .pen 変換器 |
