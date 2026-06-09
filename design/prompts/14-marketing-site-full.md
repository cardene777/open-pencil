# 14: Marketing Site 全体 (multi-screen)

製品コーポレートサイト / multi-page marketing site の全画面を 1 プロンプトで生成。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品 / 企業】
- 名前と 1 文の説明:
- 業種・カテゴリ:
- 対象顧客 (B2B / B2C / 個人 / 企業 / etc):
- primary conversion (デモリクエスト / 営業問合せ / wait list / 直接購入):
- 競合 (任意、 トーンの差別化基準として):

【トーン】(3-5 語):

【含めるページ】(必要なものだけ)
- [ ] Home
- [ ] Product (製品詳細)
- [ ] Features (全機能一覧)
- [ ] Pricing (価格 / 比較表)
- [ ] About (会社紹介 / チーム)
- [ ] Customers (顧客事例)
- [ ] Blog index + Blog post
- [ ] Docs (技術ドキュメント landing)
- [ ] Changelog
- [ ] Demo request
- [ ] Sales contact
- [ ] (その他、 自由記入)

【共通 nav 構造】
- header に表示するナビ項目 (例「Product / Pricing / Customers / Blog / Login / Demo」):
- footer に表示するカテゴリ (例「Product / Company / Resources / Legal」):
```

## Optional

```
【ブランド】
- メインカラー:
- アクセント:
- ロゴ画像 path (任意):
- 既存 brand guideline path (任意):

【特有要素】
- 「顧客ロゴ wall 強調」
- 「ROI calculator 含む」
- 「動画 testimonial」
- 「SOC 2 / GDPR / 業界別認証 表示」

【SEO / コンテンツ】
- 主要キーワード (任意、 タイトル / コピー反映):
- 既存 case study の情報 (顧客名 / 結果数値):

【言語 / 国際化】
- (default 英語、 日本語 + 英語の bilingual なら明記)
```

## AI が公式 reference から自動補完

- 全画面 1440 幅 / fit_content 縦
- 全ピクセル数値 (`landing-page.md` + `design-system.md` 由来)
- 全コピー文 (headline / sub / button / nav / blog post 雛形等)
- カラーパレット展開
- typography scale (corporate らしく 1-2 family)
- 共通 header / footer の identical 維持 (全 page で同じ)
- landing-page reference の Hero rule / Brief / Imagery hierarchy / Anti-Slop
- B2B 特有: trust building (customer logos / case study / 認証バッジ)
- Pricing 標準 pattern (3 tier + comparison table + ROI calc 任意)
- Blog 標準構造 (index grid + post 2 col / TOC / related)
- Docs landing 標準 (search + 6 category card + popular articles)
- Conversion ページ (form 8 field / 隣に testimonial / trust badge)

## サンプル

```
/pencil-design

【出力】design/marketing-stride.fig + .pen

【製品】
- 名前と 1 文の説明: Stride ── 中小企業向け人事 SaaS (採用 + 評価 + 給与)
- 業種・カテゴリ: B2B SaaS / HR Tech
- 対象顧客: 50-500 名規模の企業の HR / 経営陣
- primary conversion: デモリクエスト + 営業問い合わせ
- 競合: BambooHR / Gusto / SmartHR

【トーン】
- confident corporate / 親しみやすさ / enterprise

【含めるページ】
- [x] Home
- [x] Product
- [x] Features
- [x] Pricing
- [x] About
- [x] Customers
- [x] Blog index + post
- [x] Docs landing
- [x] Changelog
- [x] Demo request
- [x] Sales contact

【共通 nav 構造】
- header: Product / Solutions / Customers / Pricing / Resources / Sign in / Get demo (CTA)
- footer: Product / Solutions / Resources / Company / Legal / Social

【ブランド】
- メインカラー: indigo 系
- アクセント: cyan (highlights)

【特有要素】
- 顧客ロゴ wall 強調 (Home 上部)
- ROI calculator (Pricing page)
- SOC 2 + GDPR + ISO 27001 認証バッジ

【言語】
- 英語 default、 日本語版は別 page で別途生成予定
```

## さらに短い指示

```
/pencil-design

design/marketing-stride.fig + .pen。
Stride ── 中小企業 (50-500 人) 向け HR SaaS、 採用 + 評価 + 給与。
confident corporate、 indigo + cyan。
全 page (Home / Product / Features / Pricing / About / Customers / Blog / Docs / Changelog / Demo / Sales)。
nav: Product / Solutions / Customers / Pricing / Resources / Sign in / Get demo。
顧客ロゴ wall と ROI calculator 必須。
```

## 修正指示

```
Home の Hero に動画 placeholder 追加
Pricing に Enterprise tier (Custom) 追加
Blog index を 4 column grid に
About に Investors section 追加
全 page mobile responsive 版を別 page に
日本語版を別 page に
```

## ヒント

- B2B SaaS marketing site は **trust building が最重要**、 customer logo / case study / 認証バッジを Optional で明示すると効果的
- Pricing の tier 構造は競合分析で決まる、 競合を Required に書くとトーンが整う
- Blog / Docs はあると SEO 強化、 ただし content production が必要なので「画面のみ」と理解しておく
- Demo request の form 項目数を絞ると CV 改善 (公式 reference 知見、 AI が標準で 7-9 field に絞る)
