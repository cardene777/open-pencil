# 14: Marketing Site 全体 (multi-screen)

製品コーポレートサイト / multi-page marketing site の Home / Product / Pricing / About / Customers / Blog / Docs / Conversion を 1 プロンプトで生成。

## 使い方

下のプロンプトをコピーして `<...>` を書き換える。
header / footer の全 page identical 維持、 Hero rule、 Pricing tier 構造、 Blog standard pattern、 Demo request form 等は AI が公式 reference から自動補完。

## プロンプト

~~~text
/pencil-design

[製品 / 企業]
- 名前: <例 Stride>
- 1 文の説明: <例 中小企業向け人事 SaaS (採用 + 評価 + 給与)>
- 業種・カテゴリ: <例 B2B SaaS / HR Tech>
- 対象顧客: <例 50-500 名規模の企業の HR / 経営陣>
- primary conversion: <例 デモリクエスト + 営業問い合わせ>
- 競合 (任意、 トーンの差別化基準): <例 BambooHR / Gusto / SmartHR>

[トーン (3-5 語)]
- <例 confident corporate / 親しみやすさ / enterprise>

[含めるページ]
- Home
- Product (製品詳細)
- Features (全機能一覧)
- Pricing (価格 / 比較表)
- About (会社紹介 / チーム)
- Customers (顧客事例)
- Blog index + Blog post
- Docs (技術ドキュメント landing)
- Changelog
- Demo request
- Sales contact

(↑ 不要なページは削除)

[共通 nav 構造]
- header に表示する nav 項目: <例 Product / Solutions / Customers / Pricing / Resources / Sign in / Get demo (CTA)>
- footer に表示するカテゴリ: <例 Product / Solutions / Resources / Company / Legal / Social>

[ブランド (任意)]
- メインカラー: <例 indigo 系 / 任意>
- アクセント: <例 cyan (highlights) / 任意>
- ロゴ画像 path: <任意>
- 既存 brand guideline path: <任意>

[特有要素 (任意)]
- <例 顧客ロゴ wall 強調 (Home 上部)>
- <例 ROI calculator (Pricing page)>
- <例 動画 testimonial>
- <例 SOC 2 / GDPR / ISO 27001 認証バッジ>

[SEO / コンテンツ (任意)]
- 主要キーワード: <任意、 タイトル / コピー反映>
- 既存 case study 情報: <例 顧客名 / 結果数値>

[言語 / 国際化]
- <default 英語、 日本語必須 / bilingual なら明記>

[出力]
- design/<file 名>.fig と .pen に書き出して。
- 全画面の overview PNG と各 page 個別 PNG と Components PNG を /tmp に保存して Read。
- 全ページ 1440 幅 / fit_content 縦、 全 frame は Screen/<page>。
- 全ピクセル数値 / 全コピー文 / 共通 component / Pricing 標準 pattern / Blog 標準構造 / Docs landing 標準 は
  ~/.claude/skills/pencil-design/references/ の landing-page.md (全 Marketing 系) と
  design-system.md (spacing / button hierarchy) に従って AI 補完。
- header と footer は全ページで identical (同じ nav / 同じ高さ / 同じカラー)。
- B2B 特有: trust building (customer logos / case study / 認証バッジ) は AI が組み込み。
- Pricing は 3 tier + comparison table (任意で ROI calc / FAQ)。
- Demo request は form 7-9 field (Lead Capture 標準) + 隣に testimonial / trust badge。
~~~

## 補足

- 修正は自然文: 「Home の Hero に動画 placeholder 追加」「Pricing に Enterprise tier (Custom) 追加」「Blog index を 4 column grid に」「About に Investors section 追加」「全 page mobile responsive 版を別 page に」「日本語版を別 page に」
- B2B SaaS marketing site は trust building が最重要、 customer logo / case study / 認証バッジを Optional で明示すると効果的
- Pricing の tier 構造は競合分析で決まる、 競合を Required に書くとトーンが整う
- Blog / Docs はあると SEO 強化、 ただし content production が必要なので「画面のみ」と理解しておく
- Demo request の form 項目数を絞ると CV 改善 (AI が標準で 7-9 field に絞る)

## AI が補完する内容

- 全画面 1440 幅 / fit_content 縦
- 全ピクセル数値 (landing-page + design-system 由来)
- 全コピー文 (headline / sub / button / nav / blog post 雛形等)
- カラーパレット展開
- typography scale (corporate らしく 1-2 family)
- 共通 header / footer の identical 維持 (全 page で同じ)
- Hero rule / Brief / Imagery hierarchy / Anti-Slop (landing-page reference)
- B2B 特有: trust building (customer logos / case study / 認証バッジ)
- Pricing 標準 pattern (3 tier + comparison table + ROI calc 任意)
- Blog 標準構造 (index grid + post 2 col / TOC / related)
- Docs landing 標準 (search + 6 category card + popular articles)
- Conversion ページ (form 7-9 field / 隣に testimonial / trust badge)
