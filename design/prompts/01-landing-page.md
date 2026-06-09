# 01: Landing Page

マーケティング LP / 製品紹介ページ用。

## 使い方

下のプロンプトをそのままコピーして、 `<...>` の部分だけ書き換えて terminal の claude に貼り付け。
ピクセル数値・カラー hex・全コピー文・spacing は全部 AI が公式 reference から補完するので、 書かなくて大丈夫。

## プロンプト

~~~text
/pencil-design

[製品]
- 名前: <例 Cashlight>
- 1 文の説明: <例 共働きカップル向けの資産管理アプリ>
- 業種・カテゴリ: <例 Fintech / 個人投資 SaaS>
- 対象ユーザー (1 文): <例 30-40 代の共働き夫婦、 信頼感を重視する層>
- primary conversion (LP のゴール 1 つ): <例 ウェイトリスト登録>

[トーン]
- 方向性 (3-5 語): <例 落ち着いた / 信頼感 / 大人のラグジュアリー>
- 想定する印象: <例 editorial luxury / minimal / brutalist / playful / luxury / corporate のいずれか or 自由>

[セクション]
- Hero
- Trust logos
- Problem / Solution
- Features (3 件)
- Social proof / Testimonials
- Pricing
- FAQ
- Final CTA
- Footer

(↑ 順序自由、 不要なものは削除して OK)

[ブランド (任意)]
- メインカラー: <例 紺色系 / 緑系 / 書かなくてもトーンから自動選定>
- アクセントカラー: <例 ゴールド系 / 任意>
- フォント希望: <例 見出しに serif / 任意>

[特有要素 (任意、 必要なものだけ)]
- <例 セキュリティ section 必須 (規制ロゴ表示)>
- <例 hero に実在感のある人物写真>
- <例 動画埋め込み必須>

[言語]
- <default 英語、 日本語 LP なら明記>

[出力]
- design/<file 名>.fig と design/<file 名>.pen の両方に書き出して。
- 全体の PNG プレビューを /tmp に保存して Read で見せて。
- ピクセル数値 / hex / 全コピー文 / spacing / typography は
  ~/.claude/skills/pencil-design/references/ の landing-page.md と
  design-system.md に従って AI 側で自動補完して。
- 公式 LP reference の Hero rule / Anti-Slop / Imagery hierarchy を守って。
~~~

## 補足

- 修正は自然文で OK: 「Hero の見出しもっと大きく」「Pricing を 3 tier から 2 tier に」「Footer 暗くしすぎ、 トーン落として」
- 数値や hex は書かない (AI が公式から補完するため)
- 既存 design system がある場合は `[既存 design system 参照] file path: design/...` を追加すると token を流用してくれる

## AI が補完する内容

- 全ピクセル数値 (padding / gap / radius / fontSize、 公式 LP reference 由来)
- 全コピー文 (headline / subheadline / CTA label、 業種と goal から生成)
- カラーパレット (メインカラーから 5-8 色に拡張、 success / warning / error 含む)
- typography scale (display / heading / body / caption)
- Hero rule (700px 高 / 1 idea / 1 primary CTA)
- Anti-Slop rule (flat bg 禁止 / generic font 回避)
- Imagery hierarchy (transformation imagery > contextual > product-in-env > isolated)
- Creative variation 1-3 件 (公式 LP の Mandatory)
