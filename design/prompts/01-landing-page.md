# 01: Landing Page

マーケティング LP / 製品紹介ページ用。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品】
- 名前と 1 文の説明:
- 業種・カテゴリ:
- 対象ユーザー (1 文):
- primary conversion (= LP のゴール、 1 つだけ):

【トーン】
- 方向性 (3-5 語、 例「minimal / 信頼感 / 落ち着いた」):
- 想定する印象 (例「luxury」「playful」「brutalist」「editorial」のいずれか or 自由):

【セクション】(必要なものだけ列挙、 順序も自由)
- Hero
- (Trust logos)
- (Problem / Solution)
- (Features)
- (Social proof / Testimonials)
- (Pricing)
- (FAQ)
- Final CTA
- Footer
```

## Optional (書きたければ)

```
【ブランド】
- メインカラー (1 色、 例「緑系」「#XXXXXX」):
- アクセントカラー (任意):
- フォント希望 (任意、 例「serif heading 希望」):

【機能制約】
- (必須要素、 例「動画埋め込み必須」「Stripe 決済明記」):
- (避けたい要素、 例「アニメーション控えめ」):

【言語】
- (default 英語、 日本語 LP なら明記):
```

## AI が公式 reference から自動補完するもの

- 全ピクセル数値 (padding / gap / radius / fontSize、 `landing-page.md` 由来)
- 全コピー文 (headline / subheadline / CTA label、 業種と goal から生成)
- カラーパレット展開 (メインカラーから 5-8 色に拡張)
- 各セクションの構造詳細 (Hero 内の bullet 数 / Feature の card 数 等)
- Imagery hierarchy (transformation imagery 優先、 公式 LP reference)
- Hero rule (700px 高 / 1 idea / 1 primary CTA)
- Anti-Slop rule (flat bg 禁止 / generic font 回避)
- Creative variation 1-3 件 (公式 LP の Mandatory)

## サンプル (Required だけ埋めた現実的な指示)

```
/pencil-design

【出力】design/lp-cashlight.fig + .pen

【製品】
- 名前と 1 文の説明: Cashlight ── 共働きカップル向けの資産管理アプリ
- 業種・カテゴリ: Fintech / 個人投資 SaaS
- 対象ユーザー: 30-40 代の共働き夫婦、 デザインと信頼感を重視する層
- primary conversion: ウェイトリスト登録

【トーン】
- 方向性: 落ち着いた / 信頼感 / 大人のラグジュアリー
- 想定する印象: editorial luxury

【セクション】
- Hero
- Trust logos
- Problem / Solution
- Features (3 件)
- Social proof
- Pricing
- FAQ
- Final CTA
- Footer

【ブランド】
- メインカラー: 紺色系 (navy)
- アクセントカラー: ゴールド系
- フォント希望: 見出しに serif (Playfair Display 系)

【機能制約】
- セキュリティ section 必須 (regulator 表示)
- イラストではなく実在感のある人物画像を hero に
```

## さらに短い指示 (要素を絞った最低限版)

```
/pencil-design

design/lp-cashlight.fig + .pen に書き出して。
Cashlight ── 共働きカップル向け資産管理 Fintech、 30-40 代向け。
落ち着いた editorial luxury、 紺 + gold。
LP 1 枚で、 ウェイトリスト登録が goal。
Hero / Problem / Features / Pricing / FAQ / Final CTA / Footer。
```

これだけでも AI が完成形まで補完する。 ピクセル数値・コピー・色展開・spacing 等は全部 AI 任せで OK。

## 修正指示 (生成後の差分)

```
Hero の見出しもっと大きく
Pricing を 3 tier から 2 tier に
Footer 暗くしすぎ、 トーン落として
イラスト系の画像は外して写真ベースに
```

数値や色 hex を書かず、 「対象 + 方向性」だけで指示する。
