# pencil-design プロンプト集

`/pencil-design` skill を使ってデザインを生成するための **プロンプトテンプレ集**。

## 設計思想

ユーザーは **What** (何を / 誰のために / どんな機能) を書き、 AI は **How** (px / hex / コピー文 / レイアウト) を公式 reference (`~/.claude/skills/pencil-design/references/`) から自動補完します。

```
ユーザー入力 (5-7 項目)            AI 自動補完 (skill が公式から)
────────────────────────────       ─────────────────────────────
- 製品名 + 1 文                    - ピクセル数値
- 業種                             - カラーパレット
- 対象ユーザー                     - 全コピー文
- トーン (3-5 語)                  - typography scale
- 必要画面リスト                   - spacing / radius
                                   - icon 選択
                                   - layout pattern
```

ピクセル数値や hex color、 コピー文の細部までユーザーが書く必要はありません。 「ミニマル / ダーク / アクセント緑」 のような **方向性だけ伝えれば AI が補完** します。

## skill 呼び出し

```
/pencil-design <指示文>
```

明示 slash command が確実。 自然文 (「LP 作って」等) でも description trigger で発動するが、 確実にしたいなら slash 形式推奨。

## テンプレ

### 単発画面テンプレ

| ファイル | 用途 |
|---|---|
| `01-landing-page.md` | マーケティング LP / プロダクト紹介ページ |
| `02-dashboard.md` | 管理画面 / 分析ダッシュボード |
| `03-mobile-app.md` | iOS / Android app 1 画面 |
| `04-slides.md` | プレゼン資料 (1920x1080) |
| `05-settings.md` | アプリ内設定画面 |

### アプリケーション全体テンプレ (multi-screen)

| ファイル | 用途 | 画面数 |
|---|---|---|
| `10-saas-app-full.md` | SaaS web アプリ全体 | 12-22 |
| `11-fintech-app-full.md` | Fintech アプリ全体 | 14-24 |
| `12-ecommerce-app-full.md` | E-commerce 全体 | 12-20 |
| `13-mobile-app-full.md` | Mobile app 全体 | 10-18 |
| `14-marketing-site-full.md` | Corporate / Marketing site 全体 | 8-12 |

## 各テンプレの構造

| section | 役割 |
|---|---|
| Required | ユーザーが必ず書く欄 (5-7 項目) |
| Optional | 書きたい人だけ書く欄 (色 / フォント / 既存 DS 等) |
| AI 補完 | skill が公式 reference から自動で埋める内容のリスト |
| サンプル | Required を埋めた現実的な指示例 (短い、 真似しやすい) |

## 共通の指示テクニック

### Do (これだけで十分)

- 製品名と 1 文の説明
- 業種 (SaaS / Fintech / EC / Mobile / etc)
- 対象ユーザー (1 文、 例 「中小企業の HR」)
- トーン (3-5 語、 例 「ミニマル / ダーク / 信頼感」)
- 必要画面と各画面の主機能 (1-2 文ずつ)

### 書かなくていい

- ピクセル数値 (62 / 36 / 24 等) — 公式 reference 由来で AI が決める
- hex color (#XXX) — トーンとブランドカラー任意指定で AI が決める
- コピー文 (英文 / 日本語) — 業種と画面用途から AI が生成
- フォント family — トーンに合わせて AI が選ぶ
- radius / shadow / spacing — design-system reference 通り

### Optional で書くと効くもの

- ブランドカラー 1-2 色 (「アクセントは緑系」程度でも OK)
- 「ログインに SSO 必須」のような **機能制約**
- 既存 design system file path (あるなら token 流用)
- 言語 (日本語 UI なら明記、 default 英語)

### 修正指示の出し方 (生成後)

```
Hero の文字サイズもっと大きく
Sidebar をもっとミニマルに
Pricing を 3 tier から 2 tier に
```

差分は **「対象 + 方向性」だけ** で OK。 数値はやはり AI に委ねる。

## skill が参照する公式 reference (補完元 SSOT)

| reference | 補完される内容 |
|---|---|
| `landing-page.md` | LP 構成・Hero rule・Anti-Slop |
| `web-app.md` | 16 原則 (Purpose First / Hierarchy 等) |
| `mobile-app.md` | Status Bar 62px / Tab Bar 36 等の数値 spec |
| `slides.md` | typography scale / layout-01〜06 |
| `design-system.md` | spacing table / button hierarchy / token |
| `figma-plugin-api-quirks.md` | inkly CLI 実装時の罠回避 |
| `inkly-cli-cookbook.md` | bun + CLI 使い方 |
