# 12: E-commerce 全体 (multi-screen)

EC サイト / D2C ブランド / マーケットプレイスの全画面を 1 プロンプトで一括生成。

## Required (ユーザーが書く)

```
/pencil-design

【出力】design/<name>.fig + .pen

【製品】
- 名前と 1 文の説明:
- カテゴリ (D2C / マーケットプレイス / EC サイト / etc):
- 取扱商品 (1-3 文):
- 対象顧客:
- 平均注文額 (おおよそ、 価格帯感):

【トーン】(3-5 語):

【含める画面グループ】
- [ ] Storefront (Home / Category / Search / Product detail / Reviews)
- [ ] Cart & Checkout (Cart / Shipping / Payment / Confirmation)
- [ ] Account (Sign in / Orders / Order detail / Wishlist / Addresses)
- [ ] Admin (Dashboard / Product list / Product edit)
- [ ] States (Empty cart / Out of stock / Order not found)
- [ ] Components

【特有要素】(EC 固有のオプション、 必要なものだけ)
- size guide
- variant selector (色 / サイズ / 素材)
- review with photo
- wishlist
- trade / B2B 価格
- subscription / 定期購入
- 試着 / サンプル取り寄せ
- 配送オプション (express / white glove)
```

## Optional

```
【ブランド】
- メインカラー:
- アクセント:
- 既存 brand guideline 参照 (任意):

【決済】
- 必須決済方法 (Apple Pay / Shop Pay / Bank transfer / Klarna etc):

【言語 / 通貨】
- (default 英語 + USD、 日本円なら明記):
```

## AI が公式 reference から自動補完

- 全画面 4 列グリッド配置
- 全ピクセル数値 (`landing-page.md` + `web-app.md` + `design-system.md` 由来)
- 全コピー文 (商品名 / 説明 / button label / breadcrumb / empty cart 等)
- カラーパレット展開 (sale 色含む)
- typography scale (price は読みやすく)
- E-commerce 標準 pattern:
  - product card (sold out / on sale / new badge)
  - color swatch / size selector
  - quantity stepper
  - cart summary block
  - shipping address form
  - order status timeline (Ordered → Confirmed → Shipped → Delivered)
  - review stars + photo grid
  - admin product editor (variant matrix / inventory / SEO)
- Trust badge (free shipping / returns / authenticity)
- Urgency / scarcity micro-copy ("Only 3 left" 等)
- mobile responsive 想定の breakpoint

## サンプル

```
/pencil-design

【出力】design/ec-heira.fig + .pen

【製品】
- 名前と 1 文の説明: Heira ── D2C のセラミックタイル ブランド (家のリフォーム向け)
- カテゴリ: D2C インテリア
- 取扱商品: ハンドメイドのセラミックタイル (床 / 壁 / 浴室)、 多色多サイズ
- 対象顧客: 30-50 代、 注文住宅 / リノベ検討中、 デザイン重視
- 平均注文額: 8 万円

【トーン】
- editorial / mate texture / 紙質感 / 落ち着いた

【含める画面グループ】
- [x] Storefront
- [x] Cart & Checkout
- [x] Account
- [x] Admin
- [x] States
- [x] Components

【特有要素】
- size guide
- 色 swatch (12 色程度)
- サイズ selector (4 サイズ)
- review with photo
- サンプル取り寄せ (¥500)
- 配送オプション (Standard / Express / White glove with installation)

【ブランド】
- メインカラー: terracotta brown 系
- アクセント: sand gold

【言語】
- 英語 default + 日本語版を別 page に
```

## さらに短い指示

```
/pencil-design

design/ec-heira.fig + .pen。
Heira ── D2C セラミックタイル、 注文住宅 / リノベ向け、 AOV 8 万円。
editorial / 紙質感、 terracotta + gold。
全画面 (Storefront / Cart / Account / Admin / States)。
色 swatch + サイズ selector + サンプル取り寄せ + white glove 配送あり。
日本語版も別 page に。
```

## 修正指示

```
Product detail に "Pairs well with" 推奨 4 件追加
Cart の summary を sticky から bottom drawer mobile に
Admin に Collections 管理画面追加
Order detail に追跡地図 placeholder 追加
全画面 mobile responsive を別 page に
```

## ヒント

- EC は **特有要素** が大きく差別化を生むので、 list で具体的に書くと反映される
- 価格帯 (AOV) で UI のヴィジュアル重さが変わる (高単価 → 余白多 / 写真大、 低単価 → 情報密度高)
- subscription / 定期購入は標準パターンが特殊なので Optional で明記すると良い
